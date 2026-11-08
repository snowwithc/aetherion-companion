{
  "brand": {
    "name": "Aetherion Companion",
    "attributes": [
      "arcade-serious (STEM + tactics)",
      "high-contrast readable at arm’s length",
      "anime-gloss + cosmic circuitry",
      "touch-first, one-handed",
      "performance-aware (camera/ML later)"
    ],
    "design_style_fusion": {
      "layout_principles": [
        "Bento grid for non-battle screens (Title/Map/Library)",
        "HUD-first combat layout (data near action)",
        "Card-frame motifs (parchment labels + metallic trims)",
        "Soft glass panels ONLY as overlays (not text-heavy areas)"
      ],
      "inspiration_refs": {
        "battle_hud_patterns": [
          {
            "title": "DUALITY — Mobile Card Battle Game UI/UX (Behance, 2026)",
            "url": "https://www.behance.net/gallery/246454139/DUALITY-Mobile-Card-Battle-Game-UIUX",
            "notes": "Use: chunky mobile HUD, strong icon telegraphs, layered panels, big CTAs."
          },
          {
            "title": "Playcraft UI gallery references (Slay the Spire / Persona / FF) aggregated",
            "url": "https://playcraft.space/gallery/slay-the-spire/combat-ten-card-hand/",
            "notes": "Use: intent telegraph near enemy, bottom interaction zone patterns."
          }
        ],
        "campaign_map_patterns": [
          {
            "title": "Card Quest campaign map progression description",
            "url": "https://playgama.com/game/card-quest",
            "notes": "Use: node progression locked behind victories; show locks + next node highlight."
          }
        ]
      }
    }
  },

  "typography": {
    "google_fonts": {
      "display": {
        "family": "EB Garamond",
        "weights": [600, 700],
        "usage": "AETHERION wordmark-adjacent headings, parchment labels, card titles"
      },
      "ui": {
        "family": "Manrope",
        "weights": [400, 500, 600, 700],
        "usage": "HUD numbers, buttons, settings, chips, logs"
      },
      "mono_optional": {
        "family": "IBM Plex Mono",
        "weights": [500, 600],
        "usage": "debug overlay + confidence readouts"
      }
    },
    "text_size_hierarchy_tailwind": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl",
      "h2": "text-base md:text-lg",
      "body": "text-sm md:text-base",
      "small": "text-xs"
    },
    "numeric_style": {
      "recommendation": "Use tabular numbers for HP/Energy/Defense",
      "tailwind": "[font-variant-numeric:tabular-nums]"
    }
  },

  "color_system": {
    "notes": [
      "Dark UI, no dark/saturated gradients on UI elements.",
      "Gradients allowed only as subtle section backgrounds (<=20% viewport).",
      "Element colors are accents; keep text on solid dark panels for readability."
    ],
    "tokens_css_variables": {
      "how_to_apply": "Override :root and .dark in /app/frontend/src/index.css with these HSL tokens; keep shadcn structure.",
      "base": {
        "--bg-0": "222 45% 6%",
        "--bg-1": "223 40% 9%",
        "--panel": "223 34% 12%",
        "--panel-2": "223 28% 16%",
        "--text": "210 40% 98%",
        "--text-dim": "215 18% 78%",
        "--muted": "223 18% 22%",
        "--border": "220 18% 26%",
        "--ring": "188 92% 52%"
      },
      "brand_accents": {
        "--aether-cyan": "188 92% 52%",
        "--aether-silver": "255 18% 78%",
        "--aether-lavender": "262 42% 72%",
        "--aether-gold": "42 92% 56%"
      },
      "elements": {
        "--el-solar": "42 92% 56%",
        "--el-hydro": "214 92% 60%",
        "--el-wind": "186 78% 52%",
        "--el-plants": "142 62% 46%",
        "--el-fire": "24 92% 56%",
        "--el-magma": "6 82% 54%"
      },
      "states": {
        "--hp": "142 62% 46%",
        "--hp-low": "6 82% 54%",
        "--energy": "188 92% 52%",
        "--shield": "214 92% 60%",
        "--warning": "42 92% 56%",
        "--danger": "6 82% 54%",
        "--success": "142 62% 46%"
      },
      "parchment": {
        "--parchment": "42 55% 88%",
        "--parchment-ink": "222 45% 10%",
        "--parchment-border": "35 35% 70%"
      },
      "shadcn_mapping_dark": {
        "--background": "var(--bg-0)",
        "--foreground": "var(--text)",
        "--card": "var(--panel)",
        "--card-foreground": "var(--text)",
        "--popover": "var(--panel)",
        "--popover-foreground": "var(--text)",
        "--primary": "var(--aether-cyan)",
        "--primary-foreground": "222 45% 8%",
        "--secondary": "var(--panel-2)",
        "--secondary-foreground": "var(--text)",
        "--muted": "var(--muted)",
        "--muted-foreground": "var(--text-dim)",
        "--accent": "var(--panel-2)",
        "--accent-foreground": "var(--text)",
        "--destructive": "var(--danger)",
        "--destructive-foreground": "210 40% 98%",
        "--border": "var(--border)",
        "--input": "var(--border)",
        "--ring": "var(--ring)",
        "--radius": "0.9rem"
      }
    },
    "allowed_background_gradient_usage": {
      "hero_only": {
        "tailwind_example": "bg-[radial-gradient(1200px_circle_at_20%_-10%,hsla(188,92%,52%,0.18),transparent_55%),radial-gradient(900px_circle_at_90%_10%,hsla(42,92%,56%,0.10),transparent_60%)]",
        "rule": "Use only on Title screen header area or Campaign Map header; never behind dense text."
      }
    }
  },

  "spacing_and_layout": {
    "global": {
      "safe_area": "Use env(safe-area-inset-*) padding for iOS notch; wrap main screens in px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+12px)]",
      "touch_targets": "Minimum 44px height; primary battle buttons 52–60px",
      "grid": {
        "mobile": "4px baseline; use gap-3/4, p-4/5",
        "tablet": "max-w-[980px] mx-auto for non-battle screens only"
      }
    },
    "battle_screen_layout": {
      "portrait": {
        "structure": [
          "TopBar (sticky)",
          "EnemyStage (art + HP/def/status + intent bubble)",
          "PlayerStage (character figure + vitals + fusion/scenario/boosters)",
          "ZoneStrip (A/B/C/D chips)",
          "ActionsRow (Attack/Action Card/Recharge + fused variants)",
          "CombatLog (collapsible)"
        ],
        "recommended_heights": {
          "top_bar": "56px",
          "enemy_stage": "28vh (min 180px)",
          "player_stage": "26vh (min 170px)",
          "zone_strip": "72px",
          "actions": "92px",
          "log_collapsed": "44px"
        },
        "thumb_zone": "Keep primary actions in bottom 25% of viewport."
      },
      "landscape": {
        "structure": [
          "Left column: EnemyStage (top) + PlayerStage (bottom)",
          "Right column: ZoneStrip (top) + ActionsRow (middle) + CombatLog (bottom)"
        ],
        "grid": "grid grid-cols-[1.2fr_0.8fr] gap-3",
        "note": "Landscape must remain readable from a phone stand: increase font sizes by 1 step and keep buttons tall."
      }
    }
  },

  "components": {
    "component_path": {
      "shadcn_primary": [
        "/app/frontend/src/components/ui/button.jsx",
        "/app/frontend/src/components/ui/badge.jsx",
        "/app/frontend/src/components/ui/card.jsx",
        "/app/frontend/src/components/ui/progress.jsx",
        "/app/frontend/src/components/ui/sheet.jsx",
        "/app/frontend/src/components/ui/drawer.jsx",
        "/app/frontend/src/components/ui/tabs.jsx",
        "/app/frontend/src/components/ui/table.jsx",
        "/app/frontend/src/components/ui/scroll-area.jsx",
        "/app/frontend/src/components/ui/slider.jsx",
        "/app/frontend/src/components/ui/switch.jsx",
        "/app/frontend/src/components/ui/tooltip.jsx",
        "/app/frontend/src/components/ui/collapsible.jsx",
        "/app/frontend/src/components/ui/dialog.jsx",
        "/app/frontend/src/components/ui/sonner.jsx"
      ]
    },

    "battle_hud": {
      "top_bar": {
        "use": "Card + inline chips",
        "classes": "sticky top-0 z-40 bg-[hsl(var(--bg-0)/0.92)] backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--bg-0)/0.72)] border-b border-[hsl(var(--border))]",
        "content": [
          "Wave indicator (Wave 2/3)",
          "Episode name",
          "Round #",
          "Settings icon (opens Sheet)"
        ],
        "data_testids": {
          "wave": "battle-topbar-wave-text",
          "episode": "battle-topbar-episode-text",
          "round": "battle-topbar-round-text",
          "settings": "battle-topbar-settings-button"
        }
      },

      "bars": {
        "hp_bar": {
          "visual": "Segmented glossy bar with subtle inner highlight; low HP pulses",
          "implementation": {
            "base_classes": "h-3 rounded-full bg-[hsl(var(--muted))] overflow-hidden",
            "fill_classes": "h-full rounded-full bg-[hsl(var(--hp))] shadow-[0_0_0_1px_hsl(var(--hp)/0.35),0_6px_18px_-10px_hsl(var(--hp)/0.55)]",
            "low_state": "when hpPct<0.25 add animate-[pulse_1.2s_ease-in-out_infinite] and switch fill to bg-[hsl(var(--hp-low))]"
          },
          "data_testids": {
            "value": "player-hp-value-text",
            "bar": "player-hp-bar"
          }
        },
        "energy_bar": {
          "visual": "Cyan energy with tick marks (optional)",
          "classes": "h-2.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden",
          "fill": "bg-[hsl(var(--energy))]",
          "data_testids": {
            "value": "player-energy-value-text",
            "bar": "player-energy-bar"
          }
        },
        "defense": {
          "visual": "Shield % as pill badge",
          "classes": "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-[hsl(var(--panel-2))] border border-[hsl(var(--border))]",
          "data_testids": {
            "player": "player-defense-pill",
            "enemy": "enemy-defense-pill"
          }
        }
      },

      "enemy_intent": {
        "visual": "Telegraphed next move bubble anchored near enemy art; icon + damage number; color-coded by severity",
        "classes": "rounded-2xl px-3 py-2 bg-[hsl(var(--panel)/0.92)] border border-[hsl(var(--border))] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]",
        "severity_colors": {
          "low": "ring-1 ring-[hsl(var(--aether-cyan)/0.35)]",
          "medium": "ring-1 ring-[hsl(var(--warning)/0.35)]",
          "high": "ring-1 ring-[hsl(var(--danger)/0.35)]"
        },
        "micro_interaction": "On intent change: animate bubble with y:-6 -> 0 and opacity 0->1 (Framer Motion).",
        "data_testids": {
          "wrapper": "enemy-intent-bubble",
          "damage": "enemy-intent-damage-text",
          "icon": "enemy-intent-icon"
        }
      },

      "status_icons": {
        "visual": "Small rounded pills with icon + stack count; long-press shows Tooltip",
        "classes": "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-[hsl(var(--panel-2))] border border-[hsl(var(--border))]",
        "data_testids": {
          "player_row": "player-status-row",
          "enemy_row": "enemy-status-row"
        }
      },

      "zone_strip": {
        "visual": "Four chips A/B/C/D with mini 3D tilt thumbnail; wrong-zone warning as amber outline + helper text",
        "chip_classes": "relative flex-1 rounded-2xl px-2 py-2 bg-[hsl(var(--panel))] border border-[hsl(var(--border))]",
        "empty_state": "Show 'Empty' + dashed border",
        "wrong_zone_state": "border-[hsl(var(--warning))] shadow-[0_0_0_1px_hsl(var(--warning)/0.35)]",
        "thumbnail": {
          "classes": "h-10 w-8 rounded-md bg-[hsl(var(--panel-2))] border border-[hsl(var(--border))]",
          "tilt": "CSS: perspective(600px) rotateX(8deg) rotateY(-10deg)"
        },
        "data_testids": {
          "zone_a": "zone-chip-a",
          "zone_b": "zone-chip-b",
          "zone_c": "zone-chip-c",
          "zone_d": "zone-chip-d",
          "warning": "zone-strip-warning-text"
        }
      },

      "action_buttons": {
        "button_style": {
          "primary": {
            "shape": "rounded-2xl",
            "classes": "h-14 rounded-2xl bg-[hsl(var(--aether-cyan))] text-[hsl(222_45%_8%)] font-semibold shadow-[0_14px_30px_-18px_hsl(var(--aether-cyan)/0.65)]",
            "hover": "hover:brightness-[1.03]",
            "press": "active:scale-[0.98]"
          },
          "secondary": {
            "classes": "h-14 rounded-2xl bg-[hsl(var(--panel-2))] border border-[hsl(var(--border))] text-[hsl(var(--text))]",
            "hover": "hover:bg-[hsl(var(--panel-2)/0.85)]",
            "press": "active:scale-[0.98]"
          },
          "danger": {
            "classes": "h-14 rounded-2xl bg-[hsl(var(--danger))] text-white"
          },
          "disabled": "disabled:opacity-50 disabled:cursor-not-allowed"
        },
        "energy_cost_badge": {
          "visual": "Small cyan gem at top-right of button",
          "classes": "absolute -top-2 right-2 rounded-full px-2 py-1 text-xs bg-[hsl(var(--bg-0))] border border-[hsl(var(--border))]"
        },
        "data_testids": {
          "attack": "battle-attack-button",
          "action_card": "battle-action-card-button",
          "recharge": "battle-recharge-button",
          "raw_attack": "battle-raw-attack-button",
          "energy_attack": "battle-energy-attack-button"
        }
      },

      "manual_card_tray": {
        "pattern": "Bottom sheet (Drawer) with Tabs: Activation / Booster / Scenario; tap card to place into correct zone; per-zone remove; optional Force Zone toggle",
        "use_components": ["drawer", "tabs", "scroll-area", "button", "toggle", "badge"],
        "tray_card": {
          "classes": "rounded-xl bg-[hsl(var(--panel))] border border-[hsl(var(--border))] p-3",
          "micro": "On tap: quick tilt + slide-to-zone toast (sonner)."
        },
        "data_testids": {
          "open": "manual-card-tray-open-button",
          "tabs": "manual-card-tray-tabs",
          "force_zone": "manual-card-tray-force-zone-toggle",
          "place_card": "manual-card-tray-place-card-button",
          "remove_zone_a": "manual-card-tray-remove-zone-a-button",
          "remove_zone_b": "manual-card-tray-remove-zone-b-button",
          "remove_zone_c": "manual-card-tray-remove-zone-c-button",
          "remove_zone_d": "manual-card-tray-remove-zone-d-button"
        }
      },

      "combat_log": {
        "pattern": "Collapsible panel; newest on top; color-coded tags (DMG/HEAL/STATUS)",
        "use_components": ["collapsible", "scroll-area", "badge"],
        "classes": "rounded-2xl bg-[hsl(var(--panel))] border border-[hsl(var(--border))]",
        "data_testids": {
          "toggle": "combat-log-toggle-button",
          "list": "combat-log-list"
        }
      }
    },

    "setup_calibration": {
      "layout": "Top-down mat preview placeholder with 4 zone boxes A-D; per-zone detected card + confidence; stepper instruction",
      "zone_box": {
        "classes": "rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--panel)/0.6)]",
        "active_step": "ring-2 ring-[hsl(var(--aether-cyan)/0.55)]"
      },
      "fallback_banner": {
        "text": "Camera/model not found, use Manual mode",
        "classes": "rounded-2xl bg-[hsl(var(--warning)/0.12)] border border-[hsl(var(--warning)/0.35)] text-[hsl(var(--text))]"
      },
      "data_testids": {
        "mode": "setup-detection-mode-pill",
        "step": "setup-instruction-text",
        "zone_a": "setup-zone-a-box",
        "zone_b": "setup-zone-b-box",
        "zone_c": "setup-zone-c-box",
        "zone_d": "setup-zone-d-box"
      }
    },

    "campaign_map": {
      "pattern": "3 episode cards stacked vertically; each card contains 3 wave nodes (1-3) with lock states; wave 3 boss has crown icon",
      "episode_card": {
        "classes": "rounded-3xl bg-[hsl(var(--panel))] border border-[hsl(var(--border))] p-4",
        "header": "Episode title in EB Garamond + subtitle",
        "nodes": "Use small circular buttons connected by a thin line; locked nodes show lock icon + reduced opacity"
      },
      "data_testids": {
        "episode_1": "campaign-episode-1-card",
        "episode_2": "campaign-episode-2-card",
        "episode_3": "campaign-episode-3-card",
        "wave_node": "campaign-wave-node-button"
      }
    },

    "card_library": {
      "grid": "2 cols mobile, 3 cols sm, 4 cols md; cards are tappable with CSS 3D tilt on hover (desktop) and press (mobile)",
      "filters": "Use Command or Select + Input for search; keep sticky filter bar",
      "detail": {
        "3d_card": "Use react-three-fiber for hero card preview; fallback to static image when low graphics",
        "fusion_matrix": "10x5 table: Activation (columns) x Character (rows) with cell showing fusion name + short effect; tap cell opens Dialog with full text"
      },
      "data_testids": {
        "search": "card-library-search-input",
        "filter_type": "card-library-type-filter",
        "card_tile": "card-library-card-tile",
        "detail_open": "card-library-detail-open-button",
        "fusion_cell": "fusion-matrix-cell"
      }
    },

    "settings": {
      "pattern": "List of Cards with Switch/Slider rows; disabled camera select row shows 'Phase 2' badge; language row shows 'coming soon'",
      "use_components": ["card", "switch", "slider", "select", "badge"],
      "data_testids": {
        "sound": "settings-sound-switch",
        "detection_mode": "settings-detection-mode-select",
        "camera_select": "settings-camera-select",
        "confidence": "settings-confidence-threshold-slider",
        "debounce": "settings-debounce-frames-slider",
        "debug": "settings-debug-overlay-switch",
        "low_graphics": "settings-low-graphics-switch",
        "reset": "settings-reset-progress-button",
        "language": "settings-language-row"
      }
    }
  },

  "motion_and_microinteractions": {
    "library": "Framer Motion",
    "principles": [
      "Fast UI: 160–220ms for taps; 240–320ms for sheets",
      "Use opacity/translate/scale only; avoid heavy blur animations",
      "Respect prefers-reduced-motion"
    ],
    "battle_animations": {
      "dice_roll": {
        "spec": "Start-of-battle d6: 600–900ms tumble + settle; result pops with scale 1.08 -> 1",
        "implementation_hint": "Use motion.div with rotateZ + y + spring; keep single element"
      },
      "floating_numbers": {
        "spec": "Damage/heal numbers float up 24px, fade out, slight scale down",
        "classes": "text-lg font-bold drop-shadow",
        "colors": {
          "damage": "text-[hsl(var(--danger))]",
          "heal": "text-[hsl(var(--success))]",
          "energy": "text-[hsl(var(--energy))]"
        }
      },
      "hit_flash": {
        "spec": "Enemy art flashes white overlay 80ms then returns; screen shake max 6px",
        "note": "Keep subtle for phone stand readability"
      },
      "character_idle_2_5d": {
        "presentation": {
          "mask": "Soft radial vignette mask (CSS mask-image radial-gradient)",
          "glow": "Element-colored outer glow behind portrait",
          "badge": "Element badge covers the empty hexagon slot top-right",
          "idle": "Slow bob: y: [0,-6,0] over 3.2s easeInOut infinite",
          "parallax": "On pointer move (desktop) or device tilt later: translateX/Y max 6px"
        },
        "tailwind_scaffold": {
          "wrapper": "relative w-[180px] h-[190px] sm:w-[220px] sm:h-[230px]",
          "glow": "absolute inset-0 rounded-[28px] blur-xl opacity-60 bg-[radial-gradient(circle_at_30%_20%,hsla(var(--el-wind),0.55),transparent_55%)]",
          "portrait": "relative rounded-[28px] overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--panel-2))]",
          "vignette": "[mask-image:radial-gradient(circle_at_50%_35%,black_62%,transparent_100%)]"
        }
      }
    },
    "scroll": {
      "campaign_map": "Subtle parallax on episode cards (y translate 8px max) when scrolling",
      "library_grid": "Stagger in cards on first load (8–12 items max per batch)"
    }
  },

  "3d_and_graphics": {
    "requirements": {
      "3d_card": "Use @react-three/fiber + drei for Card Library detail and 'card played' moment",
      "fallback": "If Low Graphics enabled: render static image with CSS tilt only"
    },
    "install_steps": [
      "npm i three @react-three/fiber @react-three/drei"
    ],
    "usage_notes": [
      "Keep canvas small (max 320px height on mobile).",
      "Use a single directional light + environment preset.",
      "Avoid postprocessing in v1."
    ]
  },

  "image_urls": {
    "backgrounds": [
      {
        "category": "title/campaign header subtle background",
        "description": "Cosmic navy abstract with cyan circuitry feel (use as low-opacity overlay)",
        "url": "https://images.unsplash.com/photo-1701633903451-3da2d0f39a85?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "library header subtle background",
        "description": "Abstract blue pattern; use blur + opacity 10–18%",
        "url": "https://images.unsplash.com/photo-1651491602333-fea83f1d9107?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      },
      {
        "category": "settings header subtle background",
        "description": "Blue abstract square; use as decorative corner only",
        "url": "https://images.unsplash.com/flagged/photo-1573752434924-1c7100f2c54d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85"
      }
    ]
  },

  "accessibility": {
    "contrast": "All text on dark panels must meet WCAG AA; avoid cyan text on dark without sufficient weight/size.",
    "focus": "Use visible focus ring: ring-2 ring-[hsl(var(--ring))] ring-offset-2 ring-offset-[hsl(var(--bg-0))]",
    "reduced_motion": "Wrap motion with prefers-reduced-motion; provide instant state changes.",
    "readability": "Use text-sm minimum for HUD labels; numbers at least text-base; avoid thin weights on dark."
  },

  "instructions_to_main_agent": {
    "high_priority": [
      "Remove centered layout from App.css (do not use .App { text-align:center }).",
      "Set default theme to dark by adding className='dark' on html/body root (or via Tailwind dark mode strategy).",
      "Implement Battle screen with portrait-first layout and a landscape grid variant.",
      "Every interactive element and key info text must include data-testid (kebab-case).",
      "Use shadcn Drawer for Manual Card Tray bottom sheet; use Sonner for toasts.",
      "No particle effects; keep animations to Framer Motion + CSS only.",
      "Gradients only as subtle section backgrounds <=20% viewport; never on small UI elements."
    ],
    "suggested_file_targets": [
      "/app/frontend/src/index.css (override tokens)",
      "/app/frontend/src/App.css (remove CRA demo styles)",
      "/app/frontend/src/pages/Battle.jsx (new)",
      "/app/frontend/src/components/battle/* (HUD components)"
    ]
  }
}

<General UI UX Design Guidelines>  
    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms
    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text
   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json

 **GRADIENT RESTRICTION RULE**
NEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc
NEVER use dark gradients for logo, testimonial, footer etc
NEVER let gradients cover more than 20% of the viewport.
NEVER apply gradients to text-heavy content or reading areas.
NEVER use gradients on small UI elements (<100px width).
NEVER stack multiple gradient layers in the same viewport.

**ENFORCEMENT RULE:**
    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors

**How and where to use:**
   • Section backgrounds (not content backgrounds)
   • Hero section header content. Eg: dark to light to dark color
   • Decorative overlays and accent elements only
   • Hero section with 2-3 mild color
   • Gradients creation can be done for any angle say horizontal, vertical or diagonal

- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**

</Font Guidelines>

- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. 
   
- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.

- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.
   
- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly
    Eg: - if it implies playful/energetic, choose a colorful scheme
           - if it implies monochrome/minimal, choose a black–white/neutral scheme

**Component Reuse:**
	- Prioritize using pre-existing components from src/components/ui when applicable
	- Create new components that match the style and conventions of existing components when needed
	- Examine existing components to understand the project's component patterns before creating new ones

**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component

**Best Practices:**
	- Use Shadcn/UI as the primary component library for consistency and accessibility
	- Import path: ./components/[component-name]

**Export Conventions:**
	- Components MUST use named exports (export const ComponentName = ...)
	- Pages MUST use default exports (export default function PageName() {...})

**Toasts:**
  - Use `sonner` for toasts"
  - Sonner component are located in `/app/src/components/ui/sonner.tsx`

Use 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.
</General UI UX Design Guidelines>
