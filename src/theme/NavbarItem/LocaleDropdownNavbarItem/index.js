/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useAlternatePageUtils } from '@docusaurus/theme-common/internal';
import { translate } from '@docusaurus/Translate';
import { useLocation } from '@docusaurus/router';
import DropdownNavbarItem from '@theme/NavbarItem/DropdownNavbarItem';
import IconLanguage from '@theme/Icon/Language';
import styles from './styles.module.css';

const GOOGLE_LANGUAGES = [
    { label: '日本語', code: 'ja' },
    { label: '한국어', code: 'ko' },
    { label: 'Français', code: 'fr' },
    { label: 'Español', code: 'es' },
    { label: 'Русский', code: 'ru' },
    { label: 'Deutsch', code: 'de' },
];

export default function LocaleDropdownNavbarItem({
    mobile,
    dropdownItemsBefore,
    dropdownItemsAfter,
    ...props
}) {
    const {
        i18n: { currentLocale, locales, localeConfigs },
    } = useDocusaurusContext();
    const alternatePageUtils = useAlternatePageUtils();
    const { search, hash } = useLocation();

    // Helper function to get current Google Translate language code from cookie
    const getGoogleTranslateLangCode = () => {
        if (typeof document === 'undefined') return null;
        const cookie = document.cookie.split('; ').find(row => row.startsWith('googtrans='));
        if (cookie) {
            const match = cookie.match(/googtrans=\/[^\/]+\/([^;]+)/);
            return match ? match[1] : null;
        }
        return null;
    };

    // Helper function to get language label from cookie
    const getLanguageLabelFromCookie = () => {
        const langCode = getGoogleTranslateLangCode();
        if (langCode) {
            const googleLang = GOOGLE_LANGUAGES.find(lang => lang.code === langCode);
            if (googleLang) {
                return googleLang.label;
            }
        }
        return localeConfigs[currentLocale]?.label || 'English';
    };

    // State to track current language label
    const [currentLangLabel, setCurrentLangLabel] = React.useState(getLanguageLabelFromCookie());

    // Update language label based on Google Translate cookie
    React.useEffect(() => {
        const updateLabel = () => {
            setCurrentLangLabel(getLanguageLabelFromCookie());
        };

        // Initial update
        updateLabel();

        // Listen for storage events (from other tabs/windows)
        window.addEventListener('storage', updateLabel);

        // Poll for cookie changes (fallback)
        const interval = setInterval(updateLabel, 1000);

        return () => {
            window.removeEventListener('storage', updateLabel);
            clearInterval(interval);
        };
    }, [currentLocale, localeConfigs]);

    // Hide Google Translate banner frame if present
    React.useEffect(() => {
        const frame = document.querySelector('.goog-te-banner-frame');
        if (frame) {
            frame.style.display = 'none';
        }
    }, []);

    // Helper function to trigger Google Translate programmatically
    const handleGoogleTranslate = (langCode) => {
        // Set Google Translate cookie
        const cookieValue = '/en/' + langCode;

        // Set cookie without domain for localhost compatibility
        document.cookie = 'googtrans=' + cookieValue + '; path=/';

        // Also set with domain if not localhost
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            document.cookie = 'googtrans=' + cookieValue + '; path=/; domain=' + window.location.hostname;
        }

        // If currently on a /zh-CN/ page, redirect to English version first
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/zh-CN/')) {
            // Remove /zh-CN prefix to go to English version
            const englishPath = currentPath.replace(/^\/zh-CN/, '') || '/';
            window.location.href = englishPath + window.location.search + window.location.hash;
        } else {
            // Reload the page to apply translation
            window.location.reload();
        }
    };

    const activeGoogleLang = getGoogleTranslateLangCode();
    const activeClass = mobile ? 'menu__link--active' : 'dropdown__link--active';

    const localeItems = locales.map((locale) => {
        const baseTo = `pathname://${alternatePageUtils.createUrl({
            locale,
            fullyQualified: false,
        })}`;
        const to = `${baseTo}${search}${hash}`;

        // Native locale is only active if no Google Translate is active AND locale matches
        const isActive = !activeGoogleLang && locale === currentLocale;

        return {
            label: localeConfigs[locale].label,
            lang: localeConfigs[locale].htmlLang,
            to,
            target: '_self',
            autoAddBaseUrl: false,
            className: `notranslate ${isActive ? activeClass : ''}`.trim(),
            onClick: () => {
                // Clear Google Translate cookies when switching to native locales
                const clearCookie = (name) => {
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/seatunnel-website;';
                    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=.' + window.location.hostname + '; path=/;';
                    }
                };
                clearCookie('googtrans');
            }
        };
    });

    const googleItems = GOOGLE_LANGUAGES.map((lang) => {
        const isActive = activeGoogleLang === lang.code;
        return {
            label: lang.label,
            to: '#',
            className: `notranslate ${isActive ? activeClass : ''}`.trim(),
            onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleGoogleTranslate(lang.code);
                return false;
            },
        };
    });

    const items = [...dropdownItemsBefore, ...localeItems, ...googleItems, ...dropdownItemsAfter];

    const dropdownLabel = mobile
        ? translate({
            message: 'Languages',
            id: 'theme.navbar.mobileLanguageDropdown.label',
            description: 'The label for the mobile language switcher dropdown',
        })
        : currentLangLabel;

    return (
        <DropdownNavbarItem
            {...props}
            mobile={mobile}
            className="notranslate"
            label={
                <>
                    <div id="google_translate_element" style={{ visibility: 'hidden', height: 0, overflow: 'hidden', position: 'absolute' }} />
                    <IconLanguage className={styles.iconLanguage} />
                    {dropdownLabel}
                </>
            }
            items={items}
        />
    );
}
