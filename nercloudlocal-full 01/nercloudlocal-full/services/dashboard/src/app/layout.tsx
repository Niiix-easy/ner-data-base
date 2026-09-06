import "./globals.css";

export const metadata = {
  title: "NeerCloud Local",
  description: "Painel local"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
