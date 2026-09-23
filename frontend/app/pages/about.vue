<script setup lang="ts">
useContentSeo({ title: 'About', description: 'An academic full-stack reproduction of the GeeksforGeeks learning platform.', path: '/about' });
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-12">
    <h1 class="text-3xl font-bold tracking-tight text-ink">About this project</h1>
    <div class="prose-gfg mt-6">
      <p>
        This site is an <strong>academic software-engineering project</strong>: a full-stack reproduction of the information architecture, visual design and interaction patterns of GeeksforGeeks. It was built to study how such a product is put together end to end: content management, structured tutorials, an online judge with sandboxed code execution, quizzes with server-side scoring, community discussion and administration.
      </p>
      <p>It is not affiliated with, endorsed by, or connected to GeeksforGeeks or Sanchhaya Education Private Limited; the name and logo styling are reproduced for coursework only. All article, tutorial, course, problem and quiz content is original placeholder material written for this project.</p>

      <h2 id="stack">Technology</h2>
      <ul>
        <li><strong>Frontend:</strong> Nuxt 4, Vue 3, TypeScript, Tailwind CSS, Pinia, Monaco Editor</li>
        <li><strong>Backend:</strong> Node.js, Express, TypeScript, Zod, JWT authentication with refresh-token rotation</li>
        <li><strong>Database:</strong> PostgreSQL with Prisma ORM and full-text search</li>
        <li><strong>Execution:</strong> an isolated code-execution service that runs submissions in throw-away containers</li>
      </ul>

      <h2 id="contact">Contact</h2>
      <p>This is a coursework project. Questions about the implementation are best raised with the project author through the course.</p>

      <h2 id="privacy">Privacy</h2>
      <p>Accounts exist only to track learning progress. The platform stores your email, username, profile fields you choose to fill in, your submissions, quiz attempts, comments and bookmarks. Passwords are stored as salted hashes. No data is sold or shared with third parties.</p>

      <h2 id="terms">Terms of use</h2>
      <p>Be respectful in discussions. Do not submit code intended to attack the execution service. Content you post may be moderated or removed by editors and administrators.</p>
    </div>
  </div>
</template>
