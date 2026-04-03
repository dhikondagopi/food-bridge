import { Link, useNavigate, type LinkProps } from "react-router-dom";
import type { ReactNode, MouseEvent } from "react";

type PrefetchLinkProps = LinkProps & {
  children: ReactNode;
};

export default function PrefetchLink({
  to,
  children,
  ...props
}: PrefetchLinkProps) {
  const navigate = useNavigate();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(to);
  };

  return (
    <Link to={to} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}