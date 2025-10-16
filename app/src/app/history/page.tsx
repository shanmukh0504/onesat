import MainLayout from "@/components/layout/MainLayout";
import HistoryPage from "@/features/history/HistoryPage";

export default function History() {
  return (
    <MainLayout className="px-4 sm:px-6 lg:px-8">
      <HistoryPage />
    </MainLayout>
  );
}
