// Generado por scripts/export-design-tokens.mjs — NO editar a mano.
// Fuente de verdad: src/index.css + design-principles.md. Regenerar: node scripts/export-design-tokens.mjs

import SwiftUI

/// Paleta del design system. Un `Color` por token que resuelve solo según el tema, igual que
/// las CSS variables en la web: el llamador escribe `DesignTokens.bg`, no elige tema.
public enum DesignTokens {
    /// `--accent` — light #4f46e5 · dark #818cf8
    public static var accent: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.5059, green: 0.5490, blue: 0.9725, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.3098, green: 0.2745, blue: 0.8980, opacity: 1)) })
    }

    /// `--accent-bg` — light rgba(79, 70, 229, 0.08) · dark rgba(129, 140, 248, 0.14)
    public static var accentBg: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.5059, green: 0.5490, blue: 0.9725, opacity: 0.14))
            : UIColor(Color(.sRGB, red: 0.3098, green: 0.2745, blue: 0.8980, opacity: 0.08)) })
    }

    /// `--accent-border` — light rgba(170, 59, 255, 0.5) · dark rgba(170, 59, 255, 0.5)
    public static var accentBorder: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.6667, green: 0.2314, blue: 1.0000, opacity: 0.5))
            : UIColor(Color(.sRGB, red: 0.6667, green: 0.2314, blue: 1.0000, opacity: 0.5)) })
    }

    /// `--accent-hover` — light #4338ca · dark #a5b4fc
    public static var accentHover: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.6471, green: 0.7059, blue: 0.9882, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.2627, green: 0.2196, blue: 0.7922, opacity: 1)) })
    }

    /// `--bg` — light #fafaf9 · dark #0c0a09
    public static var bg: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.0471, green: 0.0392, blue: 0.0353, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.9804, green: 0.9804, blue: 0.9765, opacity: 1)) })
    }

    /// `--bg-elevated` — light #ffffff · dark #1c1917
    public static var bgElevated: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.1098, green: 0.0980, blue: 0.0902, opacity: 1))
            : UIColor(Color(.sRGB, red: 1.0000, green: 1.0000, blue: 1.0000, opacity: 1)) })
    }

    /// `--bg-sunken` — light #f5f5f4 · dark #141210
    public static var bgSunken: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.0784, green: 0.0706, blue: 0.0627, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.9608, green: 0.9608, blue: 0.9569, opacity: 1)) })
    }

    /// `--border` — light #e7e5e4 · dark rgba(250, 250, 249, 0.1)
    public static var border: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.9804, green: 0.9804, blue: 0.9765, opacity: 0.1))
            : UIColor(Color(.sRGB, red: 0.9059, green: 0.8980, blue: 0.8941, opacity: 1)) })
    }

    /// `--cat-1` — light #2a78d6 · dark #3987e5
    public static var cat1: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.2235, green: 0.5294, blue: 0.8980, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.1647, green: 0.4706, blue: 0.8392, opacity: 1)) })
    }

    /// `--cat-2` — light #008300 · dark #33a532
    public static var cat2: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.2000, green: 0.6471, blue: 0.1961, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.0000, green: 0.5137, blue: 0.0000, opacity: 1)) })
    }

    /// `--cat-3` — light #e87ba4 · dark #d55181
    public static var cat3: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.8353, green: 0.3176, blue: 0.5059, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.9098, green: 0.4824, blue: 0.6431, opacity: 1)) })
    }

    /// `--cat-4` — light #eda100 · dark #c98500
    public static var cat4: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.7882, green: 0.5216, blue: 0.0000, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.9294, green: 0.6314, blue: 0.0000, opacity: 1)) })
    }

    /// `--cat-5` — light #1baf7a · dark #199e70
    public static var cat5: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.0980, green: 0.6196, blue: 0.4392, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.1059, green: 0.6863, blue: 0.4784, opacity: 1)) })
    }

    /// `--cat-6` — light #eb6834 · dark #d95926
    public static var cat6: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.8510, green: 0.3490, blue: 0.1490, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.9216, green: 0.4078, blue: 0.2039, opacity: 1)) })
    }

    /// `--cat-7` — light #4a3aa7 · dark #9085e9
    public static var cat7: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.5647, green: 0.5216, blue: 0.9137, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.2902, green: 0.2275, blue: 0.6549, opacity: 1)) })
    }

    /// `--cat-8` — light #e34948 · dark #e66767
    public static var cat8: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.9020, green: 0.4039, blue: 0.4039, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.8902, green: 0.2863, blue: 0.2824, opacity: 1)) })
    }

    /// `--chart-cursor` — light #eceae9 · dark rgba(250, 250, 249, 0.07)
    public static var chartCursor: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.9804, green: 0.9804, blue: 0.9765, opacity: 0.07))
            : UIColor(Color(.sRGB, red: 0.9255, green: 0.9176, blue: 0.9137, opacity: 1)) })
    }

    /// `--code-bg` — light #f4f3ec · dark #f4f3ec
    public static var codeBg: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.9569, green: 0.9529, blue: 0.9255, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.9569, green: 0.9529, blue: 0.9255, opacity: 1)) })
    }

    /// `--donut-stroke` — light #a8a29e · dark #8c847d
    public static var donutStroke: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.5490, green: 0.5176, blue: 0.4902, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.6588, green: 0.6353, blue: 0.6196, opacity: 1)) })
    }

    /// `--exceeded` — light #b91c1c · dark #fca5a5
    public static var exceeded: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.9882, green: 0.6471, blue: 0.6471, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.7255, green: 0.1098, blue: 0.1098, opacity: 1)) })
    }

    /// `--expense` — light #dc2626 · dark #f87171
    public static var expense: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.9725, green: 0.4431, blue: 0.4431, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.8627, green: 0.1490, blue: 0.1490, opacity: 1)) })
    }

    /// `--income` — light #047857 · dark #34d399
    public static var income: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.2039, green: 0.8275, blue: 0.6000, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.0157, green: 0.4706, blue: 0.3412, opacity: 1)) })
    }

    /// `--on-accent` — light #ffffff · dark #1c1917
    public static var onAccent: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.1098, green: 0.0980, blue: 0.0902, opacity: 1))
            : UIColor(Color(.sRGB, red: 1.0000, green: 1.0000, blue: 1.0000, opacity: 1)) })
    }

    /// `--overlay` — light rgba(28, 25, 23, 0.5) · dark rgba(0, 0, 0, 0.6)
    public static var overlay: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.0000, green: 0.0000, blue: 0.0000, opacity: 0.6))
            : UIColor(Color(.sRGB, red: 0.1098, green: 0.0980, blue: 0.0902, opacity: 0.5)) })
    }

    /// `--social-bg` — light rgba(244, 243, 236, 0.5) · dark rgba(244, 243, 236, 0.5)
    public static var socialBg: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.9569, green: 0.9529, blue: 0.9255, opacity: 0.5))
            : UIColor(Color(.sRGB, red: 0.9569, green: 0.9529, blue: 0.9255, opacity: 0.5)) })
    }

    /// `--text` — light #57534e · dark #a8a29e
    public static var text: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.6588, green: 0.6353, blue: 0.6196, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.3412, green: 0.3255, blue: 0.3059, opacity: 1)) })
    }

    /// `--text-h` — light #1c1917 · dark #fafaf9
    public static var textH: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.9804, green: 0.9804, blue: 0.9765, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.1098, green: 0.0980, blue: 0.0902, opacity: 1)) })
    }

    /// `--text-muted` — light #78716c · dark #78716c
    public static var textMuted: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.4706, green: 0.4431, blue: 0.4235, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.4706, green: 0.4431, blue: 0.4235, opacity: 1)) })
    }

    /// `--transfer` — light #0284c7 · dark #38bdf8
    public static var transfer: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.2196, green: 0.7412, blue: 0.9725, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.0078, green: 0.5176, blue: 0.7804, opacity: 1)) })
    }

    /// `--warning` — light #b45309 · dark #fbbf24
    public static var warning: Color {
        Color(UIColor { $0.userInterfaceStyle == .dark
            ? UIColor(Color(.sRGB, red: 0.9843, green: 0.7490, blue: 0.1412, opacity: 1))
            : UIColor(Color(.sRGB, red: 0.7059, green: 0.3255, blue: 0.0353, opacity: 1)) })
    }
}
