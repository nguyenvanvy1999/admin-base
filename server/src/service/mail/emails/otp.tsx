import { Section, Tailwind, Text } from '@react-email/components';

export function OTPEmail({
  otp,
  purpose = 'verify your account',
}: {
  otp: string;
  purpose?: string;
}) {
  return (
    <Tailwind>
      <Section className="flex justify-center items-center w-full min-h-screen font-sans">
        <Section className="flex flex-col items-center w-80 rounded-2xl px-6 py-6 bg-gray-50 shadow-md">
          <Text className="text-sm font-medium text-violet-600">
            One-Time Password (OTP)
          </Text>

          <Text className="text-gray-600 text-sm mt-2 text-center">
            Use the code below to {purpose}.
          </Text>

          <Text className="text-5xl font-bold tracking-widest pt-4 pb-2">
            {otp}
          </Text>

          <Text className="text-gray-400 font-light text-xs pb-4">
            This code will expire in 5 minutes
          </Text>

          <Text className="text-gray-600 text-xs">
            If you didn’t request this code, you can safely ignore this email.
          </Text>
        </Section>
      </Section>
    </Tailwind>
  );
}

OTPEmail.PreviewProps = {
  otp: '987654',
  purpose: 'reset your password',
};
