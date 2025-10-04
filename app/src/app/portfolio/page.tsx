import MainLayout from '@/components/layout/MainLayout';
import PortfolioPage from '@/features/portfolio/PortfolioPage';

export default function Portfolio() {
    return (
        <MainLayout className='px-4 sm:px-6 lg:px-8'>
            <PortfolioPage />
        </MainLayout>
    );
}
