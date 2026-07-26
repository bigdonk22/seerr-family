import { ServerIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface VersionStatusProps {
  onClick?: () => void;
}

const VersionStatus = ({ onClick }: VersionStatusProps) => {
  return (
    <Link
      href="/settings/about"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onClick) {
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className="mx-2 flex items-center rounded-lg bg-gray-900 p-2 text-xs text-gray-300 ring-1 ring-gray-700 transition duration-300 hover:bg-gray-800"
    >
      <ServerIcon className="h-6 w-6" />

      <div className="flex min-w-0 flex-1 flex-col truncate px-2 last:pr-0">
        <span className="font-bold">Seerr Kids</span>
        <span className="truncate">Powered by Seerr 3.3.0</span>
      </div>
    </Link>
  );
};

export default VersionStatus;
