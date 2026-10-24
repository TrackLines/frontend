import { renderToStaticMarkup } from 'react-dom/server';
import { I18n } from '@/components/i18n-provider';

// render: renderToStaticMarkup inside the English I18n provider, for components that use Lingui.
export const render = (node: React.ReactNode) => renderToStaticMarkup(<I18n>{node}</I18n>);
