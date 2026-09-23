import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import UiPagination from '../app/components/common/UiPagination.vue';
import DifficultyBadge from '../app/components/common/DifficultyBadge.vue';
import StatusBadge from '../app/components/code/StatusBadge.vue';
import UiBadge from '../app/components/common/UiBadge.vue';

describe('UiPagination', () => {
  it('renders an ellipsis for long ranges and emits page changes', async () => {
    const wrapper = mount(UiPagination, { props: { page: 5, totalPages: 20, total: 400, pageSize: 20 } });
    expect(wrapper.text()).toContain('…');
    expect(wrapper.text()).toContain('81–100 of 400');
    const next = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Next page')!;
    await next.trigger('click');
    expect(wrapper.emitted('update:page')?.[0]).toEqual([6]);
    const current = wrapper.find('[aria-current="page"]');
    expect(current.text()).toBe('5');
  });

  it('disables previous on the first page and renders nothing for a single page', async () => {
    const first = mount(UiPagination, { props: { page: 1, totalPages: 3 } });
    const prev = first.findAll('button').find((b) => b.attributes('aria-label') === 'Previous page')!;
    expect(prev.attributes('disabled')).toBeDefined();
    const single = mount(UiPagination, { props: { page: 1, totalPages: 1 } });
    expect(single.find('nav').exists()).toBe(false);
  });
});

describe('badges', () => {
  it('labels difficulties and statuses', () => {
    expect(mount(DifficultyBadge, { props: { difficulty: 'MEDIUM' } }).text()).toBe('Medium');
    expect(mount(StatusBadge, { props: { status: 'WRONG_ANSWER' } }).text()).toContain('Wrong Answer');
    expect(mount(UiBadge, { props: { tone: 'green' }, slots: { default: 'Free' } }).text()).toBe('Free');
  });
});
