import { Segmented, type SegmentedProps } from 'antd';
import { useTranslation } from 'react-i18next';

type LanguageValue = 'en' | 'vi';

type LanguageSwitcherProps = Omit<
  SegmentedProps,
  'options' | 'value' | 'onChange'
>;

export function LanguageSwitcher(props: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const currentLanguage: LanguageValue = i18n.language?.startsWith('vi')
    ? 'vi'
    : 'en';

  return (
    <Segmented
      options={[
        { label: 'EN', value: 'en' },
        { label: 'VI', value: 'vi' },
      ]}
      value={currentLanguage}
      onChange={(value) => i18n.changeLanguage(value as LanguageValue)}
      {...props}
    />
  );
}
