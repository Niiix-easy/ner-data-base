"use client";

import React, { useState } from 'react';

export default function BillingPage() {
  const [loading, setLoading] = useState(false);

  const plans = [
    { name: 'Starter', price: '$20/month', storage: '5GB', projects: '3' },
    { name: 'Pro', price: '$50/month', storage: '50GB', projects: '10' },
    { name: 'Enterprise', price: 'Custom', storage: 'Unlimited', projects: 'Unlimited' }
  ];

  const handleSubscribe = (planName: string) => {
    setLoading(true);
    // In a real app, this would call /api/subscriptions
    setTimeout(() => {
      alert(`Successfully redirected to checkout for ${planName} plan!`);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Billing & Plans</h1>

      <section className="bg-gray-50 p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">You are currently on the <strong className="text-black">Starter</strong> plan.</p>
            <p className="text-sm text-gray-500 mt-1">Next invoice: $20.00 on Oct 1, 2023</p>
          </div>
          <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Manage Subscription</button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.name} className="border p-6 rounded-lg flex flex-col h-full bg-white shadow-sm">
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-3xl mb-6">{plan.price}</p>

              <ul className="space-y-3 mb-8 flex-grow">
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  {plan.storage} Storage
                </li>
                <li className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  {plan.projects} Projects
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(plan.name)}
                disabled={loading}
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Invoice History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2">Date</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3">Sep 1, 2023</td>
                <td className="py-3">$20.00</td>
                <td className="py-3"><span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Paid</span></td>
                <td className="py-3 text-right"><button className="text-blue-600 hover:underline">Download PDF</button></td>
              </tr>
              <tr>
                <td className="py-3">Aug 1, 2023</td>
                <td className="py-3">$20.00</td>
                <td className="py-3"><span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Paid</span></td>
                <td className="py-3 text-right"><button className="text-blue-600 hover:underline">Download PDF</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
