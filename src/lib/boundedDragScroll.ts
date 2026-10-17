/** Keep a scrollable viewport within the dragged list until the drag ends. */
export function boundDragScroll(list: HTMLElement, scroller: HTMLElement): () => void {
  const listBounds = list.getBoundingClientRect();
  const viewportBounds = scroller.getBoundingClientRect();
  const currentScroll = scroller.scrollTop;
  const minScroll = Math.min(
    currentScroll,
    Math.max(0, currentScroll + listBounds.top - viewportBounds.top)
  );
  const maxScroll = Math.max(
    currentScroll,
    Math.min(
      scroller.scrollHeight - scroller.clientHeight,
      currentScroll + listBounds.bottom - viewportBounds.bottom
    )
  );

  const stayInList = () => {
    scroller.scrollTop = Math.max(minScroll, Math.min(maxScroll, scroller.scrollTop));
  };
  scroller.addEventListener('scroll', stayInList);
  return () => scroller.removeEventListener('scroll', stayInList);
}
