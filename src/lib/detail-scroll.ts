const DETAIL_SCROLL_CONTAINER_SELECTOR = "[data-detail-scroll-container]";

export function scrollToDetailSection(targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const scrollContainer = document.querySelector<HTMLElement>(
    DETAIL_SCROLL_CONTAINER_SELECTOR,
  );
  if (!scrollContainer) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const targetRect = target.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  const targetTop =
    scrollContainer.scrollTop + targetRect.top - containerRect.top - 24;

  scrollContainer.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "smooth",
  });
}
