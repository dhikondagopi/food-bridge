import { useCallback } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { prefetchRoute } from '@/lib/prefetch';

/**
 * A Link that prefetches the target route's chunk on hover/focus.
 */
export default function PrefetchLink({ to, children, ...props }: LinkProps) {
  const path = typeof to === 'string' ? to : to.pathname ?? '';

  const handlePrefetch = useCallback(() => {
    prefetchRoute(path);
  }, [path]);

  return (
    <Link
      to={to}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      {...props}
    >
      {children}
    </Link>
  );
}
