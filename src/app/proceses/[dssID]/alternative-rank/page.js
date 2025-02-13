'use client';

import Stepper from '@/components/stepper';
import { useRouter } from 'next/navigation';

export default function AlternativeRankPage() {
  const router = useRouter();

  const alternatives = [
    { name: 'Sigit', score: '90.78', rank: '1' },
    { name: 'Silmi', score: '80.78', rank: '2' },
    { name: 'Alfy', score: '70.78', rank: '3' },
    { name: 'Rafa', score: '60.78', rank: '4' },
  ];

  return (
    <>
      {/* Header / Title */}
      <div className='flex flex-col items-center justify-center min-h-20 mt-20'>
        <h1 className='text-3xl font-bold'>Rank Result</h1>
        <p>Alternative rank bases on the score</p>
      </div>

      <Stepper step={4} />
      <div className='py-8'>
        <div className='w-3/5 mx-auto'>
          <h2 className='text-xl font-semibold mb-4'>Alternative Rank</h2>
          <table className='w-full border-collapse border border-gray-300'>
            <thead>
              <tr className='bg-gray-100'>
                <th className='border border-gray-300 p-2'>Alternative</th>
                <th className='border border-gray-300 p-2'>Score</th>
                <th className='border border-gray-300 p-2'>Rank</th>
              </tr>
            </thead>
            <tbody>
              {alternatives.map((item, index) => (
                <tr key={index} className='text-center'>
                  <td className='border border-gray-300 p-2'>{item.name}</td>
                  <td className='border border-gray-300 p-2'>{item.score}</td>
                  <td className='border border-gray-300 p-2'>{item.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className='w-3/5 mx-auto'>
        <div className='flex justify-end space-x-4 my-4'>
          <button
            className='bg-blue-400 text-white px-4 py-2 rounded'
            onClick={() => {
              router.push('/topics');
            }}
          >
            Finish
          </button>
        </div>
      </div>
    </>
  );
}
