# Brand audit — 2026-11-06 (owner request)

Sources audited against the catalog: the brand filter on
https://livedeals.3dprintingdeals.com/deals?category=filament (230 names, an Amazon deal tracker),
SpoolmanDB `main` (86 brand files) and its open pull requests (about 80, mostly the bulk
Open Filament Database import by `hochhause`). Listing counts are the tracker's filament-category
product counts on the audit date.

Rule applied: a brand gets a catalog entry when it is in SpoolmanDB (merged or pending), or when an
owning entity could be identified. In the first pass 36 Amazon names had no traceable owner and were recorded
here only; the second pass read their Amazon seller profiles, and on the owner's decision all of them now have
entries (see the seller-entity table).

## Deals-site names now in the catalog

| Deals-site name | Listings | Catalog id |
|---|---|---|
| YOOPAI | 274 | `yoopai` |
| Toksen3D | 161 | `toksen3d` |
| iBOSS | 129 | `iboss` |
| SainSmart | 98 | `sainsmart` |
| Filajoy3D | 95 | `filajoy3d` |
| Yousu | 91 | `yousu` |
| yxpolyer | 91 | `yxpolyer` |
| RepRapper | 87 | `reprapper` |
| ENOMAKER | 69 | `enomaker` |
| chitu systems | 65 | `chitu-systems` |
| LOVOON | 63 | `lovoon` |
| Stronghero3D | 62 | `stronghero3d` |
| CCTREE | 62 | `cctree` |
| SHIMMERFIL | 61 | `shimmerfil` |
| Gizmo Dorks | 55 | `gizmo-dorks` |
| MIKA3D | 52 | `mika3d` |
| AICOPYTO | 46 | `aicopyto` |
| FilaBees | 43 | `filabees` |
| Lotactree | 40 | `lotactree` |
| JAREES | 40 | `jarees` |
| EPAX | 38 | `epax` |
| ATARAXIA ART | 35 | `ataraxia-art` |
| FilaCube | 29 | `filacube` |
| LOCYFENS | 20 | `locyfens` |
| Entina | 16 | `entina` |
| UJOY3D | 12 | `ujoy3d` |
| EIBOS | 10 | `eibos` |
| TRONXY | 10 | `tronxy` |
| UJOYBIO | 10 | `ujoy3d` |
| OEM MIKA3D | 8 | `mika3d` |
| Filatech | 8 | `filatech` |
| 3D BEST Q | 5 | `3d-best-q` |
| BIQU | 5 | `biqu` |
| BIGTREETECH | 4 | `biqu` |
| Xyzprinting | 0 | `xyzprinting` |
| MG Chemicals | 0 | `mg-chemicals` |
| HELLO3D | 0 | `hello3d` |
| phrozen | 0 | `phrozen` |

## Deals-site names recorded as aliases of existing entries

| Deals-site name | Listings | Existing entry |
|---|---|---|
| OVVNYXE | 70 | ovv3d (Amazon listing brand of OVV3D, per retailer metadata) |
| JH JAMG HE | 15 | jamg-he (Amazon brand-field spelling) |
| R QIDI TECHNOLOGY | 36 | qidi-tech (Amazon brand-field spelling) |

## Researched, owner not traceable at the time (first pass)

Superseded: every one of these names now has a registered Amazon seller entity (table below) and, apart from
COMTREE (folded into `cctree`) and POJECITY (listing brand field only), a catalog entry. The findings column is
kept as written in the first pass.

| Deals-site name | Listings | Finding |
|---|---|---|
| JUSTMAKER | 97 | No legal owner found. |
| NextShapes | 96 | Only an unverified "NextShapes Technology Co., Ltd." supplier listing. |
| YUANEANG | 90 | No owner found; silk PLA resembles Yousu's, resemblance only. |
| GratKit | 86 | No owner found; one Guangdong-made Matte PLA listing on Alibaba. |
| COMTREE | 72 | A Shenzhen trademark filing surfaced in search but could not be opened to confirm. |
| TEWIRROW | 68 | Only non-filament US trademarks under an individual in Shenzhen. |
| PINBALL | 63 | US trademark for 3D filament exists (serial 98635848); owner not retrievable. Cheapest bulk PETG. |
| RAMBERY | 61 | No owner found. Bundle pricing near-identical to Miailuy; not evidence of common ownership. |
| EONO3D | 59 | No support for an Amazon-owned label. UK trademark application seen in a snippet; applicant unread. |
| Amoybaby | 57 | No owner found; silk and specialty PLA. |
| Miailuy | 53 | No owner found. See RAMBERY. |
| 3DTOOLS | 51 | Probably an Amazon seller account, not a brand; listings use Bambu Lab-style naming (inference from titles). |
| 3Dgenius | 48 | No owner found; mostly 250 g silk/rainbow PLA minis. |
| Generic | 46 | Amazon "Generic" brand field; listings are RITTSUN PETG/PETG-CF. Nothing found on RITTSUN. |
| Semdon | 42 | No entity found. |
| SunTop Food Safe | 39 | No entity found; no link to Sunlu despite the name. |
| PRILINE | 34 | No entity found; only an unofficial-looking site. |
| POJECITY | 33 | Suspected Kingroon/Landu-affiliated seller account (mixed Kingroon listings); noted on the kingroon entry. |
| TECSONAR | 30 | No entity found. |
| Epelay | 30 | No entity found; name resemblance to ePLA is coincidental as far as found. |
| YUGMCOCE | 27 | No entity found. |
| HP3DF | 24 | No entity found; no link to HP Inc. |
| Gryddle | 23 | No entity found; cheapest bundles in its batch. |
| Dikale | 21 | Primarily a 3D-pen maker; filament is an extension. Site unverified. |
| DO3D | 21 | No entity found; one eBay listing showed Creality in the brand field, probably a listing error. |
| Bblife | 21 | No entity found. |
| Kretrum | 18 | No entity found. |
| Filaxix | 18 | No entity found; fibre-filled engineering lines. |
| Vioxy Fil | 15 | No entity found. |
| FOXTRUDER | 9 | No entity found; fibre-filled engineering lines. |
| Reli3D | 8 | No web presence found; sells PP filament. |
| TTYT3D | 8 | A TTYT3D US mark is registered to a Ningbo company; not confirmed to be the filament seller. |
| WISDREAM | 8 | No entity found. |
| SPIDER MAKER | 4 | Sold through Phrozen's US store; ownership vs resale not stated. |
| FUSED MATERIALS | 4 | No entity found. |
| Tianse | 0 | No entity found. |

## Not researched — fewer than 20 filament listings and no known identity

Candidates for a later pass if any of them grows. Listing count in parentheses.

ABCWavePrint (17), YSJOMJHYS (17), Arrange Lines (16), FAHKNS (16), Jucoole (16), RANKI (16), PlastKyro (15), ONENPOXARY (13), Pangda (13), Dynta (11), Haosegd (10), CaiLab (9), JOY FUTURE (8), lumizone (7), Zi-Rui (7), HBFEYSZY (6), HEPHI3D (6), Pieinrey (6), 3Dimsfila (5), FugaCity (5), XINGTONGZHILIAN (5), HZST3D (4), Nizzarra (4), QLKJZML (4), SUMLAND (4), Colorful (3), DIY JOY (3), FXAAGFH (3), pizimae (3), Yoyi Yoyi (3), Wellshow (2), Aladrs (0), B.BAMBOO (0), BlazeX (0), BOEICA (0), BOXOB (0), Clnxmt (0), Fancypop (0), Filamorphic (0), Fovfo (0), Hngtfgaad (0), Innconee (0), Jiufu (0), Kalidora (0), Lee Fung (0), Mkoem (0), Nestink (0), QFLONGER (0), qixinziza (0), SAPLUSREPRAP (0), SHENGTIAN (0), SPOOLHAUS (0), Spriour (0), TEJUFUSE (0), Tfjumkng (0), WAINLUXPRO (0), Zmpkhba (0)

## Not filament brands (lasers, hardware, accessories, resin) — ignored

3DMkspaceu, ACMER, AOSEED, ATOMSTACK, AlgoLaser, Artilume, CHINDRAG, CNZTHDY, Cloudray, DUROZZLE, FUNCRECOL, FUNGDO, G-Hubble, GUULIBERA, HIKUDIY, Henaiser, HzdaDeve, IdeaFormer IR3, LANKEGU, LaserPecker, Longer, Magigoo, Micro-Swiss, Mssoomm, NRJMWBXM, SAHVAIM, SIMAX3D, Scrib3D, TIOPY, TMYPN, Twotrees, Uniformation, VEVOR, Vacbird, VonDream, WECREAT, WIZMAKER, Wefuit, Woxcker, XMammal, XYZTOOL, facka, iexcell

## SpoolmanDB — merged brands (86 files on `main`, was 67 at the 2026-09-20 crosswalk)

11 merged brands had no catalog entry; all now do: `3do`, `3d-printing-canada`, `ameleis`, `artillery`, `biqu`, `l3d`, `lovoon`, `matter3d`, `patron-eg`, `professional-lab`, `renkforce`.
Already covered as OEM-relationship rows rather than own entries (unchanged): 3dhojor, deeplee, inslogic,
soleyin, tecbears, teqstone, xzn, catyarn.

## SpoolmanDB — pending pull requests (checked 2026-11-06)

New brands in open PRs that now have catalog entries (40): `sovb-3d`, `smartprint`, `slic3d`, `sakata-3d`, `recyclingfabrik`, `recreus`, `print-with-smile`, `primacreator`, `precision-3d-filament`, `phrozen`, `paramount-3d`, `nebula`, `mosaic`, `locyfens`, `layerworks-solutions`, `kiwifil`, `gizmo-dorks`, `francofil`, `filkemp`, `filatech`, `filamentworld`, `filamentree`, `filacube`, `fiberthree`, `eumakers`, `epax`, `eolas-prints`, `econofil`, `dremel`, `dancyn-3d-prints`, `copymaster`, `ataraxia-art`, `arianeplast`, `american-filament`, `3dfox`, `alzament`, `3de`, `22-network`, `123-3d`, `3dpower`.

Folded into existing or sibling entries: 3D Prima Basic (#323) is a sub-line of `primacreator`; Prografen (#435)
is a Spectrum Filaments brand, already listed on `spectrum-filaments`; Fiberon (#359) is a Polymaker line;
iSANMATE (#381), iSangHu (#379), Aceaddity (#327) and 3DHoJor (#334) remain OEM rows on their makers.

Open PRs for brands already in the catalog (no action needed, useful for the Spoolman importer's `--pr` mode):
Push Plastic #438 (15 filaments, 79 colours), Protopasta #436, Polar Filament #418, OVV3D #410, Overture #408,
NinjaTek #406, MatterHackers #401, Kimya #387, IIID MAX #377, IEMAI #376, IC3D #375, Hatchbox #373, GST3D #372,
Formfutura #368, FilamentPM #363, Filamentive #362, ELEGOO #355, Devil Design #351, Cookiecad #348,
colorFabb #347, COEX 3D #346, CC3D #344, AURAPOL #342, Atomic Filament #341, ANYCUBIC #337, 3DJAKE #336,
3D-Fuel #332, SMART MATERIALS 3D #451, Sunlu glow #481, VANYO #479, Ziro3d #495, Polymaker #503,
Prusament recycled PETG #320. Schema PR #477 (manufacturer-wide colours) is still open.

Overlap with our own Direction-B candidates in `research/spoolmandb-contributions/`: the bulk import now has
open PRs for several brands we authored candidate files for (for example Atomic Filament, IC3D, Cookiecad,
COEX 3D, Push Plastic). Check each for a pending PR before submitting ours.

## Relationship findings from this audit

| Brand | Finding | Strength |
|---|---|---|
| Stronghero3D | Independent Shenzhen colour-niche maker; no link to Yasin, YOUSU or any catalog company found | absence of evidence |
| Push Plastic | No OEM, white-label or parent; Filastruder rumour still unsupported; location corrected to Springdale, Arkansas | primary source for location |
| OVVNYXE | Amazon listing brand of OVV3D | medium (retailer metadata) |
| Chitu Systems (Conjure) | Division of CBD-Tech; Conjure filament suspected made by Jamg He | suspected (retailer metadata) |
| FilaBees | Suspected Flashforge tie (seller account name); trademark owner differs | suspected |
| POJECITY | Suspected Kingroon/Landu seller account | suspected, not added |
| Phrozen | Matte PLA shares part numbers with Elegoo's | suspected (snippets only) |
| SainSmart | Resells Creality Hyper RFID PLA alongside own TPU | confirmed |
| Prografen | Spectrum Filaments brand (acquired Feb 2024) | reported |
| PrimaCreator / 3D Prima Basic | Same company, Prima Printer Nordic AB; also sells Copymaster3D | confirmed |
| SmartPrint / Professional Lab | Both point to Imagine s.c. (Poland) | suspected |
| Renkforce, EconoFil, Alzament, 123-3D, 3DE, Slic3D | Retailer house brands (Conrad, Filaments.ca, Alza, 123inkt, 3D Eksperten, Jaycar); extruders undisclosed | confirmed to suspected, see entries |
| RepRapper | Makes the RepRap Warehouse house brand | per retailer |
| UJOY3D / UJOYBIO | One brand family, two different trademark filers | medium-low |

## Amazon seller entities behind the untraced names (read 2026-11-06)

Method: one filament ASIN per brand from the deal tracker, then the Amazon product page ("Sold by",
Manufacturer field) and the seller profile ("Business Name", "Business Address"), fetched with curl and a
desktop user agent. Business Names are quoted as Amazon prints them; many are pinyin, and the English
rendering is ours and marked as such where it is a reading rather than a printed name. Raw HTML is kept
in the session scratchpad, not in the repo.

| Deals-site name | Seller storefront | Registered Business Name (rendering) | City |
|---|---|---|---|
| JUSTMAKER | Justmaker US | Yihe Technology (Suzhou) Co., Ltd. (rendering) | Suzhou, Jiangsu |
| NextShapes | NextShapes | Zhongshan Dajian Technology Co., Ltd. (rendering) | Zhongshan, Guangdong |
| YUANEANG | yuanyangkeji | Dongguan Yuanyang Plastic Technology Co., Ltd. (rendering); Manufacturer field "YUANENG" | Dongguan |
| GratKit | GratKit | Shenzhen Keyue Intelligent Equipment Co., Ltd. (rendering) | Shenzhen |
| COMTREE | HK KEKE TECH | HK CCTREE TECHNOLOGY CO., LIMITED (verbatim) — same company as `cctree`; COMTREE added as a brand | Hong Kong |
| TEWIRROW | TEWIRROW | Shenzhen Yingzhuoying Technology Co., Ltd. (rendering) | Shenzhen |
| PINBALL | PINBALL Store | Cixi Fengyuan Technology Co., LTD (verbatim) | Cixi, Ningbo |
| RAMBERY | RAMBERY | Cixi Lanbo Printing Supplies Co., Ltd. (verbatim); not the same company as PINBALL or Miailuy | Cixi, Ningbo |
| Miailuy | Miailuy | Shenzhen Wantaiyu Technology Co., Ltd (verbatim) | Shenzhen |
| Amoybaby | Amoybaby 3D | Shenzhen Weitao Industrial Co., Ltd. (verbatim) | Shenzhen |
| 3Dgenius | JMLocks | Shenzhen Jinmasuoye Co., Ltd. (rendering, uncertain) | Shenzhen |
| EONO3D | GUANGZHOU AOYUE INDUSTRIAL CO.,LTD. | same (verbatim); not an Amazon-owned label | Guangzhou |
| 3DTOOLS | 3DTOOLS Official Store | HK IBOSSEN TECHNOLOGY CO., LIMITED (verbatim); name resembles `iboss`, link not established; same floor as HK CCTREE | Hong Kong |
| Generic (RITTSUN) | RITTSUN 3D | Rittsun Technology Co., Limited (verbatim) | Hong Kong |
| Semdon | Semdon | Guangzhou Yiheng Logistics Co., Ltd. (rendering) | Guangzhou |
| SunTop Food Safe | Andersun 3d filament | Andersun Global Inc. (verbatim) | Taoyuan, Taiwan |
| PRILINE | Priline Direct | GUANGDONG SHUNDE ULTRALLINE 3D TECHNOLOGY CO.,LTD (verbatim) | Foshan (Shunde) |
| TECSONAR | Guangzhou Xujin Technology Co., Limited | Guangzhou Xujin Technology Co., Ltd. (rendering) | Guangzhou |
| Epelay | Epelay | Changzhou Hongrui Electronic Commerce Co., Ltd. (verbatim) | Changzhou, Jiangsu |
| YUGMCOCE | Spreading Wings Digital | Luohe Zhanchi IoT Co., Ltd. (rendering, uncertain) | Luohe, Henan |
| HP3DF | HP3DF Store | Haining Shenglong New Material Technology Co., Ltd (Manufacturer field, verbatim) | Haining, Zhejiang |
| Gryddle | Gryddle | Jingmen Huanxu Trading Co., Ltd. (rendering) | Jingmen, Hubei |
| Dikale | Dikale US | Shenzhen Huashang Trade Supply Chain Co., Ltd. (rendering) | Shenzhen |
| DO3D | DO3D | Yiwu Sangxuan Plastic Products Co., Ltd. (rendering) | Yiwu, Zhejiang |
| Bblife | Bblife | Yiwu Maikesu Plastic Products Co., Ltd. (rendering); same building as DO3D and TTYT3D, different companies | Yiwu, Zhejiang |
| Reli3D | Reli3D | Guangzhou Yuanqi Mancang Trading Co., Ltd. (rendering) | Guangzhou |
| SPIDER MAKER | Phrozen 3D Printer | PHROZEN TECH CO., LTD. (verbatim) — sold by `phrozen`; ownership vs resale not stated | Hsinchu, Taiwan |
| FUSED MATERIALS | SolveLight Robotics | Solve Light, LLC (verbatim) | Staten Island, NY, US |
| Tianse | TIANSE | Guangzhou Sanheng Information Technology Co., Ltd. (verbatim) | Guangzhou |
| TTYT3D | TTYT3D | Yiwu Lifen Intelligent Technology Co., Ltd. (rendering) | Yiwu, Zhejiang |
| Kretrum | Kretrum-DIY | Guangzhou Shuyu Technology Co., Ltd. (rendering) | Guangzhou |
| Filaxix | FILAXIX | Huizhou Sainasanwei Technology Co., Ltd. (rendering) | Huizhou, Guangdong |
| Vioxy Fil | shenzhenweiyang | Shenzhen Weiyang Technology Co., Ltd. (rendering) | Shenzhen |
| FOXTRUDER | FOXTRUDER-US | TINMORRY CO., LIMITED (verbatim) | Hong Kong |
| WISDREAM | Minreon Technology | Jiangsu Minreon Technology Co., Ltd. (verbatim) | Wuxi, Jiangsu |
| POJECITY | YAOQIHANG / Kingrooon | Shenzhen Yaoqihang Technology Co., Ltd. and Shenzhen Tongtuozhanzhi Keji Tech Co., Ltd. (two sellers; brand field only) | Shenzhen |

No two names share a Business Name, so none of these are the same company as each other. Three Yiwu
sellers (DO3D, Bblife, TTYT3D) and two Hong Kong sellers (HK CCTREE, HK IBOSSEN) share a building, which
is common for registered offices and is not treated as a link. Almost all are trading or e-commerce
companies, so the extruder behind each remains unknown.

Owner decision (2026-11-06): create entries for all of them. 34 draft entries were added (ids are the kebab-case
brand names; `suntop` for SunTop Food Safe, `rittsun` for the RITTSUN listings under Amazon brand "Generic",
`spider-maker` with a suspected-parent-company link to `phrozen` and a reciprocal `distributes` row).
COMTREE is a brand on `cctree` and POJECITY stays a note on `kingroon` (it is a listing brand field, not a seller).
Product lines come from the deal tracker's full listing feed; legal entities from the Amazon seller profiles;
every pinyin rendering is marked as such and such entries carry confidence low. Extruder and manufacturing
country are unknown for all 34.

## Verification pass (2026-11-06, second pass)

The Claude browser integration was not connected to the session, so the queue was run with curl (desktop
user agent, `--compressed`) and WebFetch instead. Amazon product and seller pages, USPTO TSDR and Justia
record pages read without captchas. Still blocked: aio.lv, alza.cz/alza.at, Desertcart, Alibaba company
profiles (captcha shell), SAM.gov and datacvr.virk.dk (JS applications), the Arkansas SoS search (POST form).

| Entry | Outcome | What was read |
|---|---|---|
| `filabees` | Resolved | Amazon seller Business Name = Hangzhou Juwei E-commerce Co., Ltd.; TSDR owner of FILABEES (reg. 6729027, live) is the same entity at the same address. Flashforge is listing metadata only; link stays suspected |
| `ovv3d` | Resolved | Listing: brand OVVNYXE, sold by and Manufacturer OVV3D; seller Business Name Shenzhen Hanyuan Technology = trademark applicant. HQ moved to China |
| `stronghero3d` | Entity found | Amazon seller STRONGHERO Business Name Shenzhen Zhongjingyouping Technology (rendering), Longhua, Shenzhen; matches no other catalog company |
| `chitu-systems` / `jamg-he` | Partly | Site footer "CBD-Tech"; Amazon seller legal name Shenzhen Chuangbide Technology (CBD). Amazon Conjure listings name Chitu itself as Manufacturer; Jamg He stays suspected, low-medium |
| `kingroon` (POJECITY) | Leans against | POJECITY is a brand field on listings sold by two unrelated Shenzhen sellers; no seller named POJECITY; Landu not mentioned |
| `phrozen` / `elegoo` | Partly | Elegoo's part numbers 50.203.0250/0251 confirmed on 3DJake; aio.lv still 403, Phrozen side is titles only |
| `lotactree` | Partly | TSDR: owner Longqi Europe, Lda (Portugal); reg. 7499592 cancelled Sec. 16B; new application 50028310 (2026). Alibaba parent page unreadable |
| `sainsmart` | Partly | Site footer "Vastmind LLC" read; EcomCrew Shangrui claim read on page (secondary). No primary link between the two |
| `yoopai`, `ujoy3d`, `enomaker`, `shimmerfil`, `jarees`, `aicopyto`, `filajoy3d`, `yxpolyer`, `toksen3d`, `print-with-smile` | Verified | Justia record pages read (TSDR returned 500); owners and classes confirmed, addresses decoded. Corrections: UJOYBIO "dead" status unsupported; JAREES is Class 9 only; TOKSEN3D word mark is filed under the "Tuosen" spelling; FUEL INVEST, SE added as suspected parent of Print With Smile |
| `3d-best-q` | Resolved | Amazon seller Business Name Foshan Qibaixi Trade Co., Ltd; HQ set to China |
| `push-plastic` | Partly | ToS address read on page; Birdeye lists a second Springdale address (1206 Esi Dr); registered entity and CAGE unconfirmed |
| `3de` | Still open | Live Shopify store, no imprint; CVR aggregator hit unreliable |
| `alzament` | Still open | Alza pages 403 |
| Untraced Amazon names | Resolved | Seller entities table above |

Still browser-only: aio.lv (Phrozen/Elegoo), alza.cz (Alzament), Alibaba profile (Lotactree parent),
Arkansas SoS and SAM.gov (Push Plastic entity), datacvr.virk.dk (3DE).
