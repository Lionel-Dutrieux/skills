import { type RefObject, useEffect } from 'react'

/**
 * Keeps a table's header in sight while the page scrolls past its rows.
 *
 * `position: sticky` cannot: shadcn's table sits in a box that scrolls
 * sideways (`overflow-x: auto`), which makes the box the header's scroll
 * container, and that box never scrolls down — the page does, so that the
 * page has one scroll, not two. So the header is moved instead: as the page
 * scrolls, it is translated down by how far the table's top has gone above the window,
 * never past the table's last row, and put back once the top is in sight.
 *
 * One listener on the document, captured (a scroll does not bubble, and the
 * page may scroll in an element rather than the window), and at most one
 * write a frame.
 */
export function useStickyHead(frame: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let pending = 0

    const place = () => {
      pending = 0

      const box = frame.current?.querySelector<HTMLElement>('[data-slot=table-container]')
      const head = box?.querySelector<HTMLElement>('thead')

      if (!box || !head) return

      const { height, top } = box.getBoundingClientRect()
      // The header never leaves its table: it stops over the last row.
      const room = Math.max(0, height - head.offsetHeight * 2)
      const offset = Math.min(Math.max(0, -top), room)

      head.style.transform = offset > 0 ? `translateY(${offset}px)` : ''
    }
    const schedule = () => {
      if (!pending) pending = requestAnimationFrame(place)
    }

    document.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    schedule()

    return () => {
      document.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(pending)
    }
  }, [frame])
}
