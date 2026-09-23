<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'auth', requiredRole: 'EDITOR' });
useSeoMeta({ title: 'Articles · Admin', robots: 'noindex' });
</script>

<template>
  <AdminContentTable resource="articles" title="Articles" subtitle="Write, review and publish articles." public-path="/articles" :columns="[{ key: 'viewCount', label: 'Views' }, { key: 'commentCount', label: 'Comments' }]" />
</template>
