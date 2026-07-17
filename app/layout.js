import './globals.css';

export const metadata = {
  title: 'de Writer — AI Content Management',
  description: 'Quản lý nội dung do AI tạo cho nhiều sản phẩm, đăng đa nền tảng.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
