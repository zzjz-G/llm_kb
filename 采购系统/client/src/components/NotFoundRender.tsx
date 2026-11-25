import { Link } from 'react-router-dom';

export const NotFoundRender = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
    <h1 className="mb-2 text-6xl font-bold text-primary/20">404</h1>
    <p className="mb-6 text-muted-foreground">页面不存在或已被移除</p>
    <Link
      to="/"
      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      返回首页
    </Link>
  </div>
);

export default NotFoundRender;
