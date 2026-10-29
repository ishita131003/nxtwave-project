import { Link } from 'react-router-dom';
import { buttonClass } from '../../components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-8 text-center">
      <div className="sheet relative px-5 pt-9 pb-6 sm:px-8">
        <span className="pin" aria-hidden />
      <h1 className="display text-4xl text-ink">Page not found</h1>
      <p className="mt-2 text-ink/75">That link doesn't go anywhere in this demo.</p>
      <Link to="/" className={buttonClass('primary', 'mt-6')}>
        Go to the campaign page
      </Link>
      </div>
    </div>
  );
}
