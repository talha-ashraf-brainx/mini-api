import logo from '../../assets/logo.png';

const ICON_HEIGHT = {
  sm: 'h-7',
  md: 'h-8',
  lg: 'h-9',
  xl: 'h-12',
};

const TEXT_SIZE = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-2xl',
};

/**
 * @param {object} props
 * @param {'sm' | 'md' | 'lg' | 'xl'} [props.size]
 * @param {string} [props.className]
 */
export default function AppLogo({ size = 'md', className = '' }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2 ${className}`}
      aria-label="Mini API"
    >
      <img
        src={logo}
        alt=""
        aria-hidden
        className={`w-auto shrink-0 object-contain ${ICON_HEIGHT[size]}`}
      />
      <span
        className={`truncate font-black tracking-tight text-foreground ${TEXT_SIZE[size]}`}
      >
        Mini API
      </span>
    </div>
  );
}
