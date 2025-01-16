import '@/styles/index.css';
import ReduxProvider from "../store/Provider";

export const metadata = {
  title: 'Renderform',
  description: '',
};

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <body>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
