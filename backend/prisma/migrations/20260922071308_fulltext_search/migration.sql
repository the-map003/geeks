-- Full-text search. The init migration created plain nullable "searchVector" tsvector columns
-- (declared as Unsupported("tsvector") in schema.prisma). Triggers keep them up to date and GIN
-- indexes make them fast. Triggers are used instead of GENERATED columns because Prisma's
-- introspection reports generated columns as drift.

-- ---------------------------------------------------------------------------
-- Article: title (A), excerpt (B), content (C)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION article_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."excerpt", '')), 'B') ||
    setweight(to_tsvector('english', left(coalesce(NEW."content", ''), 100000)), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER article_search_vector_trg
  BEFORE INSERT OR UPDATE OF "title", "excerpt", "content" ON "Article"
  FOR EACH ROW EXECUTE FUNCTION article_search_vector_update();

UPDATE "Article" SET "title" = "title";
CREATE INDEX "Article_searchVector_idx" ON "Article" USING GIN ("searchVector");

-- ---------------------------------------------------------------------------
-- Tutorial: title (A), description (B)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tutorial_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tutorial_search_vector_trg
  BEFORE INSERT OR UPDATE OF "title", "description" ON "Tutorial"
  FOR EACH ROW EXECUTE FUNCTION tutorial_search_vector_update();

UPDATE "Tutorial" SET "title" = "title";
CREATE INDEX "Tutorial_searchVector_idx" ON "Tutorial" USING GIN ("searchVector");

-- ---------------------------------------------------------------------------
-- TutorialLesson: title (A), content (C)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tutorial_lesson_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', left(coalesce(NEW."content", ''), 100000)), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tutorial_lesson_search_vector_trg
  BEFORE INSERT OR UPDATE OF "title", "content" ON "TutorialLesson"
  FOR EACH ROW EXECUTE FUNCTION tutorial_lesson_search_vector_update();

UPDATE "TutorialLesson" SET "title" = "title";
CREATE INDEX "TutorialLesson_searchVector_idx" ON "TutorialLesson" USING GIN ("searchVector");

-- ---------------------------------------------------------------------------
-- Course: title (A), subtitle (B), description (C)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION course_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."subtitle", '')), 'B') ||
    setweight(to_tsvector('english', left(coalesce(NEW."description", ''), 100000)), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER course_search_vector_trg
  BEFORE INSERT OR UPDATE OF "title", "subtitle", "description" ON "Course"
  FOR EACH ROW EXECUTE FUNCTION course_search_vector_update();

UPDATE "Course" SET "title" = "title";
CREATE INDEX "Course_searchVector_idx" ON "Course" USING GIN ("searchVector");

-- ---------------------------------------------------------------------------
-- Problem: title (A), description (C)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION problem_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', left(coalesce(NEW."description", ''), 100000)), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER problem_search_vector_trg
  BEFORE INSERT OR UPDATE OF "title", "description" ON "Problem"
  FOR EACH ROW EXECUTE FUNCTION problem_search_vector_update();

UPDATE "Problem" SET "title" = "title";
CREATE INDEX "Problem_searchVector_idx" ON "Problem" USING GIN ("searchVector");

-- ---------------------------------------------------------------------------
-- Quiz: title (A), description (B)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION quiz_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_search_vector_trg
  BEFORE INSERT OR UPDATE OF "title", "description" ON "Quiz"
  FOR EACH ROW EXECUTE FUNCTION quiz_search_vector_update();

UPDATE "Quiz" SET "title" = "title";
CREATE INDEX "Quiz_searchVector_idx" ON "Quiz" USING GIN ("searchVector");
