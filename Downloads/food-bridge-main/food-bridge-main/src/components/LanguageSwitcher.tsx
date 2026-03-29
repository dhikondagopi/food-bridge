import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LanguageSwitcher = ({ collapsed = false }: { collapsed?: boolean }) => {
  const { i18n } = useTranslation();

  return (
    <Select value={i18n.language?.substring(0, 2) || 'en'} onValueChange={(val) => i18n.changeLanguage(val)}>
      <SelectTrigger className={collapsed ? 'w-9 h-9 p-0 justify-center' : 'w-full h-9'}>
        {collapsed ? (
          <Globe className="h-4 w-4" />
        ) : (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 shrink-0" />
            <SelectValue />
          </div>
        )}
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.nativeLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;
