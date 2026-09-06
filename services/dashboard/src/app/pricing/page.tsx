"use client";

import React from "react";
import { useI18n } from "@/contexts/I18nContext";

export default function PricingPage() {
  const { t, locale } = useI18n();

  const plans = [
    { name: "FREE", price: 0, color: "text-gray-400" },
    { name: "DEVELOPER", price: 9, color: "text-blue-400" },
    { name: "STARTER", price: 29, color: "text-indigo-400" },
    { name: "PRO", price: 79, color: "text-green-400", popular: true },
    { name: "BUSINESS", price: 199, color: "text-orange-400" },
    { name: "SCALE", price: 599, color: "text-red-400" },
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-12 border-b border-gray-700 pb-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          {t("sidebar.pricing") || "Pricing"}
        </h1>
        <p className="text-gray-400 text-lg">
          {locale === "pt-BR"
            ? "Escolha o plano ideal para seu projeto."
            : "Choose the right plan for your project."}
        </p>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-gray-800 rounded-2xl p-8 border ${
                plan.popular ? "border-green-500 shadow-lg shadow-green-900/20 relative" : "border-gray-700"
              } flex flex-col`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider">
                  MOST POPULAR
                </div>
              )}
              <h3 className={`text-xl font-bold tracking-wider ${plan.color} mb-4`}>
                {plan.name}
              </h3>
              <div className="flex items-baseline mb-8">
                <span className="text-5xl font-extrabold tracking-tight">
                  {formatPrice(plan.price)}
                </span>
                <span className="text-gray-400 ml-2 font-medium">
                  {locale === "pt-BR" ? "/ mês" : "/ month"}
                </span>
              </div>
              <button
                className={`mt-auto w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? "bg-green-600 hover:bg-green-500 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-white"
                }`}
              >
                {locale === "pt-BR" ? "Assinar plano" : "Subscribe"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
           <h3 className="text-2xl font-bold mb-2">ENTERPRISE</h3>
           <p className="text-gray-400 mb-4">{locale === "pt-BR" ? "Vamos conversar sobre necessidades personalizadas." : "Let's talk about custom needs."}</p>
           <button className="border border-gray-500 hover:bg-gray-800 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
             Contact Sales
           </button>
        </div>
      </main>
    </div>
  );
}
