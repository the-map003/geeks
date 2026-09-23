import type { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prisma.js';
import { ApiError } from '../../utils/errors.js';
import { paginate } from '../../utils/response.js';
import { toSkipTake } from '../../utils/pagination.js';
import { courseSummaryInclude, toCourseSummary } from '../../utils/content-serializers.js';
import { categoryIdsForSlug } from '../../utils/categories.js';
import { recordActivity } from '../../utils/activity.js';
import type { ListCoursesQuery } from './courses.schemas.js';

const lessonSummarySelect = { id: true, title: true, slug: true, durationMin: true, order: true, isPreview: true } as const;

export async function listCourses(query: ListCoursesQuery) {
  const where: Prisma.CourseWhereInput = { status: 'PUBLISHED' };
  const categoryIds = await categoryIdsForSlug(query.category);
  if (categoryIds) where.categoryId = { in: categoryIds };
  if (query.level) where.level = query.level;
  if (query.free === 'true') where.isFree = true;
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { subtitle: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  const orderBy: Prisma.CourseOrderByWithRelationInput[] =
    query.sort === 'newest'
      ? [{ publishedAt: 'desc' }]
      : query.sort === 'rating'
        ? [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }]
        : [{ enrollmentCount: 'desc' }];

  const [items, total] = await Promise.all([
    prisma.course.findMany({ where, orderBy, ...toSkipTake(query), include: courseSummaryInclude }),
    prisma.course.count({ where }),
  ]);
  return paginate(items.map(toCourseSummary), total, query.page, query.pageSize);
}

async function loadCourse(slug: string) {
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      ...courseSummaryInclude,
      instructor: { select: { id: true, username: true, profile: true } },
      modules: {
        orderBy: { order: 'asc' },
        include: { lessons: { orderBy: { order: 'asc' }, select: lessonSummarySelect } },
      },
    },
  });
  if (!course || course.status !== 'PUBLISHED') throw ApiError.notFound('Course not found');
  return course;
}

async function completedLessonIds(userId: string | undefined, courseId: string): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.courseLessonProgress.findMany({
    where: { userId, lesson: { module: { courseId } } },
    select: { lessonId: true },
  });
  return new Set(rows.map((r) => r.lessonId));
}

export async function getCourse(slug: string, userId?: string) {
  const course = await loadCourse(slug);
  const [enrollment, bookmark, completed] = await Promise.all([
    userId ? prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } }) : null,
    userId ? prisma.bookmark.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } }) : null,
    completedLessonIds(userId, course.id),
  ]);

  const summary = toCourseSummary({
    ...course,
    instructor: {
      id: course.instructor.id,
      username: course.instructor.username,
      profile: course.instructor.profile
        ? { displayName: course.instructor.profile.displayName, avatarUrl: course.instructor.profile.avatarUrl }
        : null,
    },
    modules: course.modules.map((m) => ({ _count: { lessons: m.lessons.length } })),
  });

  return {
    ...summary,
    description: course.description,
    modules: course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      order: m.order,
      lessons: m.lessons.map((l) => ({ ...l, completed: completed.has(l.id) })),
    })),
    instructorProfile: {
      displayName: course.instructor.profile?.displayName ?? course.instructor.username,
      bio: course.instructor.profile?.bio ?? null,
      avatarUrl: course.instructor.profile?.avatarUrl ?? null,
      institution: course.instructor.profile?.institution ?? null,
      location: course.instructor.profile?.location ?? null,
      websiteUrl: course.instructor.profile?.websiteUrl ?? null,
      githubUrl: course.instructor.profile?.githubUrl ?? null,
      linkedinUrl: course.instructor.profile?.linkedinUrl ?? null,
    },
    enrollment: enrollment
      ? {
          id: enrollment.id,
          enrolledAt: enrollment.enrolledAt,
          completedAt: enrollment.completedAt,
          progressPercent: enrollment.progressPercent,
          lastLessonId: enrollment.lastLessonId,
        }
      : null,
    bookmarked: !!bookmark,
  };
}

export async function enroll(userId: string, slug: string) {
  const course = await prisma.course.findUnique({ where: { slug }, select: { id: true, status: true } });
  if (!course || course.status !== 'PUBLISHED') throw ApiError.notFound('Course not found');
  const existing = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } });
  if (existing) throw ApiError.conflict('You are already enrolled in this course');

  const [enrollment] = await prisma.$transaction([
    prisma.enrollment.create({ data: { userId, courseId: course.id } }),
    prisma.course.update({ where: { id: course.id }, data: { enrollmentCount: { increment: 1 } } }),
  ]);
  return enrollment;
}

export async function getLesson(slug: string, lessonSlug: string, userId: string | undefined) {
  const course = await loadCourse(slug);
  const flat = course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title })));
  const target = flat.find((l) => l.slug === lessonSlug);
  if (!target) throw ApiError.notFound('Lesson not found');

  const enrollment = userId ? await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: course.id } } }) : null;
  if (!target.isPreview) {
    if (!userId) throw ApiError.unauthorized('Sign in and enroll to access this lesson');
    if (!enrollment) throw ApiError.forbidden('Enroll in this course to access its lessons');
  }

  const lesson = await prisma.courseLesson.findUnique({ where: { id: target.id } });
  if (!lesson) throw ApiError.notFound('Lesson not found');

  const completed = await completedLessonIds(userId, course.id);
  const idx = flat.findIndex((l) => l.id === target.id);
  const totalLessons = flat.length;

  if (enrollment && enrollment.lastLessonId !== lesson.id) {
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { lastLessonId: lesson.id } }).catch(() => undefined);
  }

  const strip = (l: (typeof flat)[number] | undefined) =>
    l ? { id: l.id, title: l.title, slug: l.slug, durationMin: l.durationMin, order: l.order, isPreview: l.isPreview, completed: completed.has(l.id) } : null;

  return {
    id: lesson.id,
    title: lesson.title,
    slug: lesson.slug,
    durationMin: lesson.durationMin,
    order: lesson.order,
    isPreview: lesson.isPreview,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    completed: completed.has(lesson.id),
    module: { id: target.moduleId, title: target.moduleTitle },
    course: { id: course.id, title: course.title, slug: course.slug },
    modules: course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      order: m.order,
      lessons: m.lessons.map((l) => ({ ...l, completed: completed.has(l.id) })),
    })),
    prev: strip(idx > 0 ? flat[idx - 1] : undefined),
    next: strip(idx < flat.length - 1 ? flat[idx + 1] : undefined),
    progressPercent: totalLessons ? Math.round((completed.size / totalLessons) * 100) : 0,
    enrolled: !!enrollment,
  };
}

export async function toggleLessonComplete(userId: string, lessonId: string) {
  const lesson = await prisma.courseLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, module: { select: { courseId: true, course: { select: { status: true } } } } },
  });
  if (!lesson || lesson.module.course.status !== 'PUBLISHED') throw ApiError.notFound('Lesson not found');
  const courseId = lesson.module.courseId;

  const enrollment = await prisma.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  if (!enrollment) throw ApiError.forbidden('Enroll in this course to track progress');

  const existing = await prisma.courseLessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  let completed: boolean;
  if (existing) {
    await prisma.courseLessonProgress.delete({ where: { id: existing.id } });
    completed = false;
  } else {
    await prisma.courseLessonProgress.create({ data: { userId, lessonId } });
    await recordActivity(userId, 'lessonsCompleted');
    completed = true;
  }

  const [done, total] = await Promise.all([
    prisma.courseLessonProgress.count({ where: { userId, lesson: { module: { courseId } } } }),
    prisma.courseLesson.count({ where: { module: { courseId } } }),
  ]);
  const progressPercent = total ? Math.round((done / total) * 100) : 0;
  await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPercent,
      lastLessonId: lessonId,
      completedAt: progressPercent === 100 ? enrollment.completedAt ?? new Date() : null,
    },
  });
  return { completed, progressPercent };
}

export async function myEnrollments(userId: string) {
  const rows = await prisma.enrollment.findMany({
    where: { userId, course: { status: 'PUBLISHED' } },
    orderBy: { enrolledAt: 'desc' },
    include: { course: { include: courseSummaryInclude }, lastLesson: { select: { slug: true } } },
  });
  return rows.map((e) => ({
    enrollment: {
      id: e.id,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      progressPercent: e.progressPercent,
      lastLessonId: e.lastLessonId,
      lastLessonSlug: e.lastLesson?.slug ?? null,
    },
    course: toCourseSummary(e.course),
  }));
}
