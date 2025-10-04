import MainLayout from '@/components/layout/MainLayout';
import EarnPage from '@/features/earn/EarnPage';

export default function Earn() {
    return (
        <MainLayout className='px-4 sm:px-6 lg:px-8'>
            <EarnPage />
        </MainLayout>
    );
}
