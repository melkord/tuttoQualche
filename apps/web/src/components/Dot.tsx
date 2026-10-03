import { colorOf } from '../palette';

export const Dot = ({ i }: { i: number }) => (
  <span className="dot" style={{ background: colorOf(i) }}>
    {i + 1}
  </span>
);
