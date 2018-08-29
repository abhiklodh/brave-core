/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "brave/browser/themes/theme_properties.h"

#include "brave/browser/themes/brave_theme_service.h"
#include "chrome/browser/themes/theme_properties.h"

namespace {

base::Optional<SkColor> MaybeGetDefaultColorForBraveLightUi(int id) {
  switch (id) {
    // Applies when the window is active, tabs and also tab bar everywhere except active tab
    case ThemeProperties::COLOR_FRAME:
    case ThemeProperties::COLOR_BACKGROUND_TAB:
      return SkColorSetRGB(0xD8, 0xDE, 0xE1);
    // Window when the window is innactive, tabs and also tab bar everywhere except active tab
    case ThemeProperties::COLOR_FRAME_INACTIVE:
    case ThemeProperties::COLOR_BACKGROUND_TAB_INACTIVE:
      return SkColorSetRGB(0xC8, 0xCE, 0xC8);
    // Active tab and also the URL toolbar
    // Parts of this color show up as you hover over innactive tabs too
    case ThemeProperties::COLOR_TOOLBAR:
    case ThemeProperties::COLOR_DETACHED_BOOKMARK_BAR_BACKGROUND:
    case ThemeProperties::COLOR_CONTROL_BACKGROUND:
    case ThemeProperties::COLOR_TOOLBAR_CONTENT_AREA_SEPARATOR:
      return SkColorSetRGB(0xF6, 0xF7, 0xF9);
    case ThemeProperties::COLOR_TAB_TEXT:
      return SkColorSetRGB(0x22, 0x23, 0x26);
    case ThemeProperties::COLOR_BOOKMARK_TEXT:
    case ThemeProperties::COLOR_BACKGROUND_TAB_TEXT:
      return SkColorSetRGB(0x22, 0x23, 0x26);
    case ThemeProperties::COLOR_LOCATION_BAR_BORDER:
      return SkColorSetRGB(0xd5, 0xd9, 0xdc);
    default:
      return base::nullopt;
  }
}

const SkColor kDarkFrame = SkColorSetRGB(0x22, 0x22, 0x22);
const SkColor kDarkToolbar = SkColorSetRGB(0x39, 0x39, 0x39);
const SkColor kDarkToolbarIcon = SkColorSetRGB(0xed, 0xed, 0xed);

base::Optional<SkColor> MaybeGetDefaultColorForBraveDarkUi(int id) {
  switch (id) {
    // Applies when the window is active, tabs and also tab bar everywhere except active tab
    case ThemeProperties::COLOR_FRAME:
    case ThemeProperties::COLOR_BACKGROUND_TAB:
      return kDarkFrame;
    // Window when the window is innactive, tabs and also tab bar everywhere except active tab
    case ThemeProperties::COLOR_FRAME_INACTIVE:
    case ThemeProperties::COLOR_BACKGROUND_TAB_INACTIVE:
      return color_utils::HSLShift(kDarkFrame, { -1, -1, 0.6 });
    // Active tab and also the URL toolbar
    // Parts of this color show up as you hover over innactive tabs too
    case ThemeProperties::COLOR_TOOLBAR:
    case ThemeProperties::COLOR_TOOLBAR_TOP_SEPARATOR:
    case ThemeProperties::COLOR_TOOLBAR_TOP_SEPARATOR_INACTIVE:
    case ThemeProperties::COLOR_DETACHED_BOOKMARK_BAR_BACKGROUND:
    case ThemeProperties::COLOR_CONTROL_BACKGROUND:
    case ThemeProperties::COLOR_TOOLBAR_CONTENT_AREA_SEPARATOR:
      return kDarkToolbar;
    case ThemeProperties::COLOR_TAB_TEXT:
      return SkColorSetRGB(0xF3, 0xF3, 0xF3);
    case ThemeProperties::COLOR_BOOKMARK_TEXT:
    case ThemeProperties::COLOR_BACKGROUND_TAB_TEXT:
      return SkColorSetRGB(0xFF, 0xFF, 0xFF);
    case ThemeProperties::COLOR_LOCATION_BAR_BORDER:
      // TODO: Should be location bar background, but location bar has hover
      // color which we don't have access to here.
      // Consider increasing height instead.
      return kDarkToolbar;
    case ThemeProperties::COLOR_TOOLBAR_BUTTON_ICON:
      return kDarkToolbarIcon;
    case ThemeProperties::COLOR_TOOLBAR_BUTTON_ICON_INACTIVE:
      return color_utils::AlphaBlend(kDarkToolbarIcon, kDarkToolbar, 0x4d);
    default:
      return base::nullopt;
  }
}

const SkColor kPrivateFrame = SkColorSetRGB(0x1b, 0x0e, 0x2c);
const SkColor kPrivateToolbar = SkColorSetRGB(0x3d, 0x28, 0x41);

base::Optional<SkColor> MaybeGetDefaultColorForPrivateUi(int id) {
  switch (id) {
    // Applies when the window is active, tabs and also tab bar everywhere except active tab
    case ThemeProperties::COLOR_FRAME:
    case ThemeProperties::COLOR_FRAME_INCOGNITO:
    case ThemeProperties::COLOR_BACKGROUND_TAB:
    case ThemeProperties::COLOR_BACKGROUND_TAB_INCOGNITO:
      return kPrivateFrame;
    // Window when the window is innactive, tabs and also tab bar everywhere except active tab
    case ThemeProperties::COLOR_FRAME_INACTIVE:
    case ThemeProperties::COLOR_FRAME_INCOGNITO_INACTIVE:
    case ThemeProperties::COLOR_BACKGROUND_TAB_INCOGNITO_INACTIVE:
      return color_utils::HSLShift(kPrivateFrame, { -1, -1, 0.55 });
    // Active tab and also the URL toolbar
    // Parts of this color show up as you hover over innactive tabs too
    case ThemeProperties::COLOR_TOOLBAR:
    case ThemeProperties::COLOR_DETACHED_BOOKMARK_BAR_BACKGROUND:
    case ThemeProperties::COLOR_CONTROL_BACKGROUND:
    case ThemeProperties::COLOR_TOOLBAR_CONTENT_AREA_SEPARATOR:
      return kPrivateToolbar;
    case ThemeProperties::COLOR_TAB_TEXT:
      return SkColorSetRGB(0xF3, 0xF3, 0xF3);
    case ThemeProperties::COLOR_BOOKMARK_TEXT:
    case ThemeProperties::COLOR_BACKGROUND_TAB_TEXT:
      return SkColorSetRGB(0xFF, 0xFF, 0xFF);
    case ThemeProperties::COLOR_LOCATION_BAR_BORDER:
      // TODO: Should be location bar background, but location bar has hover
      // color which we don't have access to here.
      // Consider increasing height instead.
      return kPrivateToolbar;
    case ThemeProperties::COLOR_TOOLBAR_BUTTON_ICON:
      return kDarkToolbarIcon;
    case ThemeProperties::COLOR_TOOLBAR_BUTTON_ICON_INACTIVE:
      return color_utils::AlphaBlend(kDarkToolbarIcon, kPrivateToolbar, 0x4d);
    // The rest is covered by a dark-appropriate value
    default:
      return MaybeGetDefaultColorForBraveDarkUi(id);
  }
}

}  // namespace

// Returns a |nullopt| if the UI color is not handled by Brave.
base::Optional<SkColor> MaybeGetDefaultColorForBraveUi(int id, bool incognito, BraveThemeType theme) {
  // Consistent (and stable) values across all themes
  switch (id) {
    case ThemeProperties::COLOR_TAB_THROBBER_SPINNING:
      return SkColorSetRGB(0xd7, 0x55, 0x26);
    default:
      break;
  }

  // Allow Private Window theme to override dark vs light
  if (incognito) {
    return MaybeGetDefaultColorForPrivateUi(id);
  }
  // Get Dark or Light value
  switch (theme) {
    case BraveThemeType::BRAVE_THEME_TYPE_LIGHT:
      return MaybeGetDefaultColorForBraveLightUi(id);
    case BraveThemeType::BRAVE_THEME_TYPE_DARK:
      return MaybeGetDefaultColorForBraveDarkUi(id);
    default:
      NOTREACHED();
  }
  return base::nullopt;
}
