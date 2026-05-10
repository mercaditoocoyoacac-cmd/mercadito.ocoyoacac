"use client";

import { useState } from "react";
import { formatDateInMexico } from "@/lib/dates";

export default function PrivacyNotice() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[color:var(--muted)] underline hover:text-[color:var(--foreground)]"
      >
        Aviso de privacidad
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Aviso de Privacidad</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm text-gray-600">
          <p>
            <strong>Mercadito</strong> respects your privacy. This notice explains how we collect, use, and protect your information.
          </p>

          <div>
            <h3 className="font-semibold text-gray-900">Information We Collect</h3>
            <ul className="mt-1 list-disc pl-4">
              <li>Account information (name, email, phone)</li>
              <li>Business information (store name, address, description)</li>
              <li>Order and payment data</li>
              <li>Device and access information</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">How We Use Your Information</h3>
            <ul className="mt-1 list-disc pl-4">
              <li>Provide and operate our services</li>
              <li>Process orders and payments</li>
              <li>Communicate with you about orders</li>
              <li>Improve our services</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Public Information</h3>
            <p className="mt-1">
              By signing the service contract, you authorize us to display your business information (store name, address, phone, description) publicly on the Mercadito platform for operational purposes.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Data Protection</h3>
            <p className="mt-1">
              We implement security measures to protect your data. However, we are not responsible for unauthorized access to your public information by third parties.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Your Rights</h3>
            <ul className="mt-1 list-disc pl-4">
              <li>Access your personal data</li>
              <li>Request data correction</li>
              <li>Request data deletion</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">Contact</h3>
            <p className="mt-1">
              For privacy questions, contact: mercadito@ocoyoacac.com
            </p>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Last updated: {formatDateInMexico(new Date())}
          </p>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="mt-6 w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-white hover:bg-[var(--accent-hover)]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}