import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

/** The site name saved in Admin, Settings, Branding (rendered into a meta tag by app.blade.php). */
const appName = document.querySelector<HTMLMetaElement>('meta[name="application-name"]')?.content || import.meta.env.VITE_APP_NAME || 'WakeelDiary';

createInertiaApp({
    title: (title) => (title ? `${title}, ${appName}` : appName),
    resolve: (name) => {
        const pages = import.meta.glob('./Pages/**/*.tsx');
        const page = pages[`./Pages/${name}.tsx`];
        if (!page) {
            throw new Error(`Page not found: ${name}`);
        }
        return page() as Promise<never>;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#b8892b' },
});
