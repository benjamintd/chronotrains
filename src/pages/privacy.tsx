import React from "react";
import Head from "next/head";

const PrivacyPolicy: React.FC = () => {
  return (
    <>
      <Head>
        <title>Privacy Policy</title>
      </Head>
      <div className="flex flex-col justify-center min-h-screen py-6 sm:py-12">
        <div className="relative py-3 mx-auto sm:max-w-xl">
          <span className="text-2xl font-bold">Privacy Policy</span>
          <div className="mt-4 text-sm">
            <p className="mb-2">
              Our website, Chronotrains.com (&quot;we&quot;, &quot;us&quot;,
              &quot;our&quot;), respects your privacy and is committed to
              protecting it in accordance with this Privacy Policy.
            </p>
            <h2 className="mt-3 mb-1 font-semibold">Information We Collect</h2>
            <p>
              We collect limited personal data, such as your IP address and
              other non-identifiable information, for analytics and to improve
              the user experience.
            </p>
            <h2 className="mt-3 mb-1 font-semibold">
              Google AdSense & Cookies
            </h2>
            <p className="mb-2">
              We use Google AdSense to display ads on our website. Google uses
              cookies to serve ads based on your interests and previous
              interactions. By using our website, you consent to the use of
              these cookies.
            </p>
            <p>
              You can manage your preferences or opt-out of personalized ads by
              visiting Google&apos;s Ads Settings:{" "}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                https://www.google.com/settings/ads
              </a>
            </p>
            <h2 className="mt-3 mb-1 font-semibold">Your Rights</h2>
            <p className="mb-2">
              You have the right to access, rectify, or erase any personal data
              we hold about you. To exercise these rights, please contact us at
              benjamin.tdm@gmail.com.
            </p>
            <p>
              If you have any questions or concerns about our Privacy Policy,
              please feel free to contact us at benjamin.tdm@gmail.com.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
