# 湾区咖啡地图：门店图片与评分核验记录

- 最新核验日期：2026-07-11（UTC）
- 原始条目：70
- 清理错误条目后：57
- 新增：43（从 285 个 Google Maps 候选中筛选）
- 最终发布：100
- 删除无法成立或重复条目：13
- 评分来源：Google Maps 公开门店页，按“门店名 + 完整地址”逐项匹配
- 图片来源：同一 Google Maps 门店页的门店主图，下载成本地静态文件

## 验收口径与结果

1. 门店名和街道地址必须落到同一 Google Maps 门店条目；仅名称相似不算通过。
2. 评分与评分数从 Google Maps 列表页的同一原始响应读取；现有 57 家逐店精确查询，新增 43 家从 285 个候选中筛选。
3. 图片必须取自完成地址匹配后的同一门店页；下载后必须返回图片 MIME、文件大于 10 KB，并能解码显示。
4. 100 张图片的 SHA-256 均不相同（100/100 唯一）；新增 43 图联系表已人工目检，图片均能解码且与对应咖啡馆场景一致。
5. 新增门槛：Google Maps 评分不低于 4.5、评分数不低于 100；再按区域平衡和精确地址去重选出 43 家。
6. 最终结果：100/100 门店具备评分、评分数、来源链接和本地门店图片；应用内来源可点击回到对应 Google Maps 查询页。

评分会随新评论变化；“准确”指 2026-07-11 核验快照，不代表永久不变。

## 更正的门店资料

| 门店 | 更正 |
| --- | --- |
| Bartavelle | 1603 San Pablo Ave → 1621 San Pablo Ave |
| Blue Bottle Coffee (Mint) | 2 Mint Plaza → 66 Mint St |
| The Caffè by Mr. Espresso | Mr. Espresso / 625 Grand Ave → 当前品牌咖啡馆 / 1120 Broadway |
| Grand Coffee | 2611 Mission St → 2663 Mission St |
| Verve Coffee Roasters (SF) | 3040 24th St → 2101 Market St |
| Voyager Craft Coffee | 地址写法统一为 111 W St John St Ste 100 |
| Artís / Academic | 将 Google Maps 的 Fourth / Second 街道写法同步到数据 |

## 删除的旧条目

| ID | 原条目 | 处理理由 |
| --- | --- | --- |
| `philz-mint` | Philz Coffee · 10 Mint Plaza | 该地址未匹配到当前门店条目，未保留旧评分。 |
| `southeast-coffee` | Southeast Coffee · 2128 MacArthur Blvd | 未找到与名称和地址同时匹配的当前门店条目。 |
| `hazel-oakland` | Hazel · 920 Washington St | 未找到可核验的当前门店条目。 |
| `blue-bottle-west-loop` | Blue Bottle Coffee · 427 W Grand Ave | 该地址未匹配到当前 Blue Bottle 门店。 |
| `warm-coffee-bar` | Warm Coffee Bar · 3269 Mission St | 未找到可核验的当前门店条目。 |
| `saint-frank-russian-hill` | Saint Frank Coffee · 2320 Polk St | 地址错误且与已保留的 2340 Polk St 门店重复。 |
| `equator-tiburon` | Equator Coffees · 16 Main St | 未找到该 Tiburon 地址的当前 Equator 门店。 |
| `prosperity-sf` | Prosperity Sandwiches · 650 Townsend St | 未找到可核验的当前门店条目。 |
| `andante-oakland` | Andante Coffee · 4920 Telegraph Ave | 搜索结果指向洛杉矶同名门店，Oakland 地址无法核验。 |
| `mile-kava-berkeley` | Mile Kava & Coffee · 1809 Shattuck Ave | 未找到可核验的当前门店条目。 |
| `coupa-4th` | Coupa Cafe · 588 Hayes St | 未找到该旧金山地址的当前 Coupa 门店。 |
| `peets-marin` | Peet's Coffee · 500 Magnolia Ave | 未找到该 Larkspur 地址的当前 Peet's 门店。 |
| `flywheel-san-jose` | Flywheel Coffee Roasters · 1075 Lincoln Ave | 搜索结果仅匹配旧金山门店，San Jose 地址无法核验。 |


## 发布记录

- 发布地址：https://room.ruit.me/p/coffee/
- RoomTalk 版本：`20260711T120400Z_281ea73b`
- 发布时间：2026-07-11T12:04:00Z
- 发布构建：`npm run build:publish`
- 发布包：6 个文件，3,637,615 bytes
- 发布验收：100/100 门店卡片、100/100 评分链接、296/100 配图区域；atlas 图片 HTTP undefined
- 发布截图：[published-latest.png](../.checks/published-gallery-final.png)


## 问题条目二次搜索确认

以下是 2026-07-11 再次通过品牌官网、地址资料与地图检索得到的分类。这里严格区分“证实有误”和“无法证实”，不把搜索不到直接写成已关闭。

### 品牌或地址明确有误（8 条）

- **Philz Coffee · 10 Mint Plaza**：Philz [当前旧金山门店列表](https://philzcoffee.com/locations)没有 Mint Plaza；该地址资料反而提到附近的 Blue Bottle，因此原数据很可能混淆品牌。
- **Blue Bottle · 427 W Grand Ave**：Blue Bottle 当前 Oakland 官方页面指向 [Old Oakland · 480 9th St](https://bluebottlecoffee.com/cafes/old-oakland)，当前门店检索无法匹配 427 W Grand Ave。
- **Equator · 16 Main St, Tiburon**：Equator [官方 Marin 门店列表](https://www.equatorcoffees.com/all-locations/)没有 Tiburon；16 Main St 当前是 [Main St Mercantile](https://www.mainstmercantile.com/service/contact-us/)。
- **Coupa Cafe · 588 Hayes St**：Coupa [官方门店列表](https://www.coupacafe.com/locations/)集中在 Palo Alto、Stanford、Redwood City 与 Los Altos，没有旧金山 Hayes Street 门店。
- **Peet's · 500 Magnolia Ave, Larkspur**：该地址由 Larkspur 市政府资料确认为 American Legion Post 313 所在地，并非 Peet's；Peet's [官方定位器](https://www.peets.com/pages/store-locator)也无法匹配此门店。
- **Flywheel · 1075 Lincoln Ave, San Jose**：Flywheel [官网](https://flywheelcoffee.com/)只列出 San Francisco 的 672 Stanyan St 与 22 Battery St，没有 San Jose 门店。
- **Andante Coffee · 4920 Telegraph Ave, Oakland**：当前该地址的可核商户是 [Forma Bakery](https://www.visitoakland.com/listing/forma-bakery/8378/)，Andante 搜索结果指向洛杉矶同名门店。
- **Prosperity Sandwiches · 650 Townsend St**：650 Townsend 是大型办公物业，而非该三明治店；当前物业资料也将其列为办公楼。

### 重复且门牌错误（1 条）

- **Saint Frank · 2320 Polk St**：Saint Frank [官网](https://www.saintfrankcoffee.com/pages/our-locations)明确列出 Russian Hill 门店为 **2340 Polk St**；数据中已另有这家正确门店，所以 2320 条目既写错门牌又重复。

### 无法证实存在（4 条）

- **Southeast Coffee · 2128 MacArthur Blvd**
- **Hazel · 920 Washington St**
- **Warm Coffee Bar · 3269 Mission St**
- **Mile Kava & Coffee · 1809 Shattuck Ave**

这四条的精确名称与地址组合在当前品牌网页、地图商户页和一般网页搜索中均无可信匹配。它们不能被断言为“已经关闭”，但同样没有足够证据作为真实门店发布。

## 逐店核验明细

| # | 门店 | 已核地址 | 评分 | 评分数 | 评分来源 | 本地图片 | 字节 / SHA-256 前缀 | 目检 |
| ---: | --- | --- | ---: | ---: | --- | --- | --- | --- |
| 1 | Andytown Coffee Roasters | 3655 Lawton St, San Francisco, CA 94122 | 4.6 | 1,317 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Andytown%20Coffee%20Roasters%2C%203655%20Lawton%20St%2C%20San%20Francisco%2C%20CA%2094122) | [andytown.jpg](../public/images/cafes/andytown.jpg) | 27,486 / `c8abf2116406…` | 通过 |
| 2 | Sightglass Coffee | 270 7th St, San Francisco, CA 94103 | 4.4 | 4,239 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Sightglass%20Coffee%2C%20270%207th%20St%2C%20San%20Francisco%2C%20CA%2094103) | [sightglass.jpg](../public/images/cafes/sightglass.jpg) | 34,052 / `94f094b7ebe9…` | 通过 |
| 3 | Ritual Coffee Roasters | 1026 Valencia St, San Francisco, CA 94110 | 4.3 | 1,323 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Ritual%20Coffee%20Roasters%2C%201026%20Valencia%20St%2C%20San%20Francisco%2C%20CA%2094110) | [ritual.jpg](../public/images/cafes/ritual.jpg) | 26,472 / `f67e773bb299…` | 通过 |
| 4 | Saint Frank Coffee | 2340 Polk St, San Francisco, CA 94109 | 4.5 | 1,140 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Saint%20Frank%20Coffee%2C%202340%20Polk%20St%2C%20San%20Francisco%2C%20CA%2094109) | [saint-frank.jpg](../public/images/cafes/saint-frank.jpg) | 35,650 / `3f1148936d8d…` | 通过 |
| 5 | The Crown: Royal Coffee Lab | 2523 Broadway, Oakland, CA 94612 | 4.6 | 367 | [Google Maps](https://www.google.com/maps/search/?api=1&query=The%20Crown%3A%20Royal%20Coffee%20Lab%2C%202523%20Broadway%2C%20Oakland%2C%20CA%2094612) | [the-crown.jpg](../public/images/cafes/the-crown.jpg) | 27,093 / `b1f71856678e…` | 通过 |
| 6 | Mother Tongue Cafe & Bar | 308 41st St, Oakland, CA 94609 | 4.6 | 286 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Mother%20Tongue%20Cafe%20%26%20Bar%2C%20308%2041st%20St%2C%20Oakland%2C%20CA%2094609) | [mother-tongue.jpg](../public/images/cafes/mother-tongue.jpg) | 35,380 / `94f103ac72f2…` | 通过 |
| 7 | States Coffee | 419 40th St, Oakland, CA 94609 | 4.6 | 24 | [Google Maps](https://www.google.com/maps/search/?api=1&query=States%20Coffee%2C%20419%2040th%20St%2C%20Oakland%2C%20CA%2094609) | [states.jpg](../public/images/cafes/states.jpg) | 18,455 / `f8e9e5f7a41b…` | 通过 |
| 8 | 1951 Coffee Company | 2410 Channing Way, Berkeley, CA 94704 | 4.6 | 277 | [Google Maps](https://www.google.com/maps/search/?api=1&query=1951%20Coffee%20Company%2C%202410%20Channing%20Way%2C%20Berkeley%2C%20CA%2094704) | [1951.jpg](../public/images/cafes/1951.jpg) | 29,474 / `a2e25fc739ed…` | 通过 |
| 9 | CoRo Coffee Room | 2324 Fifth St, Berkeley, CA 94710 | 4.6 | 343 | [Google Maps](https://www.google.com/maps/search/?api=1&query=CoRo%20Coffee%20Room%2C%202324%20Fifth%20St%2C%20Berkeley%2C%20CA%2094710) | [coro.jpg](../public/images/cafes/coro.jpg) | 27,035 / `9cbaaa953775…` | 通过 |
| 10 | Artis Coffee | 1717 Fourth St B, Berkeley, CA 94710 | 4.4 | 571 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Artis%20Coffee%2C%201717%20Fourth%20St%20B%2C%20Berkeley%2C%20CA%2094710) | [artis.jpg](../public/images/cafes/artis.jpg) | 39,622 / `9e9073e2e600…` | 通过 |
| 11 | Equator Coffees | 2 Miller Ave, Mill Valley, CA 94941 | 4.5 | 848 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Equator%20Coffees%2C%202%20Miller%20Ave%2C%20Mill%20Valley%2C%20CA%2094941) | [equator.jpg](../public/images/cafes/equator.jpg) | 36,250 / `df256904f752…` | 通过 |
| 12 | Devout Coffee | 37323 Niles Blvd, Fremont, CA 94536 | 4.5 | 1,362 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Devout%20Coffee%2C%2037323%20Niles%20Blvd%2C%20Fremont%2C%20CA%2094536) | [devout.jpg](../public/images/cafes/devout.jpg) | 23,860 / `079be53012a4…` | 通过 |
| 13 | Verve Coffee Roasters | 162 University Ave, Palo Alto, CA 94301 | 4.4 | 1,285 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Verve%20Coffee%20Roasters%2C%20162%20University%20Ave%2C%20Palo%20Alto%2C%20CA%2094301) | [verve-palo-alto.jpg](../public/images/cafes/verve-palo-alto.jpg) | 23,146 / `c3b7a3f164a2…` | 通过 |
| 14 | Red Rock Coffee | 201 Castro St, Mountain View, CA 94041 | 4.4 | 1,449 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Red%20Rock%20Coffee%2C%20201%20Castro%20St%2C%20Mountain%20View%2C%20CA%2094041) | [red-rock.jpg](../public/images/cafes/red-rock.jpg) | 35,079 / `1c177dff4031…` | 通过 |
| 15 | Voyager Craft Coffee | 111 W St John St Ste 100, San Jose, CA 95113 | 4.7 | 759 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Voyager%20Craft%20Coffee%2C%20111%20W%20St%20John%20St%20Ste%20100%2C%20San%20Jose%2C%20CA%2095113) | [voyager.jpg](../public/images/cafes/voyager.jpg) | 20,303 / `f59f2a8b3d53…` | 通过 |
| 16 | Nirvana Soul | 315 S 1st St, San Jose, CA 95113 | 4.7 | 899 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Nirvana%20Soul%2C%20315%20S%201st%20St%2C%20San%20Jose%2C%20CA%2095113) | [nirvana.jpg](../public/images/cafes/nirvana.jpg) | 26,428 / `7871f4049172…` | 通过 |
| 17 | Barefoot Coffee | 1819 S Bascom Ave, Campbell, CA 95008 | 4.5 | 533 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Barefoot%20Coffee%2C%201819%20S%20Bascom%20Ave%2C%20Campbell%2C%20CA%2095008) | [barefoot.jpg](../public/images/cafes/barefoot.jpg) | 26,181 / `624c0bc1e998…` | 通过 |
| 18 | Big Mug Coffee Roaster | 3014 El Camino Real, Santa Clara, CA 95051 | 4.2 | 1,745 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Big%20Mug%20Coffee%20Roaster%2C%203014%20El%20Camino%20Real%2C%20Santa%20Clara%2C%20CA%2095051) | [big-mug.jpg](../public/images/cafes/big-mug.jpg) | 20,626 / `8d8838ecf39c…` | 通过 |
| 19 | The Coffee Movement | 1030 Washington St, San Francisco, CA 94108 | 4.7 | 1,716 | [Google Maps](https://www.google.com/maps/search/?api=1&query=The%20Coffee%20Movement%2C%201030%20Washington%20St%2C%20San%20Francisco%2C%20CA%2094108) | [coffee-movement-chinatown.jpg](../public/images/cafes/coffee-movement-chinatown.jpg) | 29,363 / `ac3a4ba88aad…` | 通过 |
| 20 | The Coffee Movement | 1737 Balboa St, San Francisco, CA 94121 | 4.8 | 507 | [Google Maps](https://www.google.com/maps/search/?api=1&query=The%20Coffee%20Movement%2C%201737%20Balboa%20St%2C%20San%20Francisco%2C%20CA%2094121) | [coffee-movement-richmond.jpg](../public/images/cafes/coffee-movement-richmond.jpg) | 14,113 / `53b93b7db4ac…` | 通过 |
| 21 | Wrecking Ball Coffee Roasters | 2271 Union St, San Francisco, CA 94123 | 4.4 | 392 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Wrecking%20Ball%20Coffee%20Roasters%2C%202271%20Union%20St%2C%20San%20Francisco%2C%20CA%2094123) | [wrecking-ball.jpg](../public/images/cafes/wrecking-ball.jpg) | 16,546 / `a85c41ff794d…` | 通过 |
| 22 | Linea Caffe | 1125 Mariposa St, San Francisco, CA 94107 | 4.4 | 304 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Linea%20Caffe%2C%201125%20Mariposa%20St%2C%20San%20Francisco%2C%20CA%2094107) | [linea-potrero.jpg](../public/images/cafes/linea-potrero.jpg) | 22,320 / `f0160e7522e0…` | 通过 |
| 23 | Linea Caffe | 3417 18th St, San Francisco, CA 94110 | 4.5 | 321 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Linea%20Caffe%2C%203417%2018th%20St%2C%20San%20Francisco%2C%20CA%2094110) | [linea-mission.jpg](../public/images/cafes/linea-mission.jpg) | 25,276 / `b20a3501850d…` | 通过 |
| 24 | Four Barrel Coffee | 375 Valencia St, San Francisco, CA 94103 | 4.5 | 2,800 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Four%20Barrel%20Coffee%2C%20375%20Valencia%20St%2C%20San%20Francisco%2C%20CA%2094103) | [four-barrel.jpg](../public/images/cafes/four-barrel.jpg) | 37,559 / `81d8f737270e…` | 通过 |
| 25 | The Mill | 736 Divisadero St, San Francisco, CA 94117 | 4.5 | 2,540 | [Google Maps](https://www.google.com/maps/search/?api=1&query=The%20Mill%2C%20736%20Divisadero%20St%2C%20San%20Francisco%2C%20CA%2094117) | [the-mill.jpg](../public/images/cafes/the-mill.jpg) | 39,038 / `34863a1ad843…` | 通过 |
| 26 | Home Coffee Roasters | 1222 Noriega St, San Francisco, CA 94122 | 4.6 | 1,304 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Home%20Coffee%20Roasters%2C%201222%20Noriega%20St%2C%20San%20Francisco%2C%20CA%2094122) | [home-sunset.jpg](../public/images/cafes/home-sunset.jpg) | 31,687 / `ac68f2028b0c…` | 通过 |
| 27 | Sextant Coffee Roasters | 1415 Folsom St, San Francisco, CA 94103 | 4.4 | 732 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Sextant%20Coffee%20Roasters%2C%201415%20Folsom%20St%2C%20San%20Francisco%2C%20CA%2094103) | [sextant-folsom.jpg](../public/images/cafes/sextant-folsom.jpg) | 30,072 / `af99d24970f7…` | 通过 |
| 28 | Sextant Coffee Roasters | 539 Valencia St, San Francisco, CA 94110 | 4.1 | 125 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Sextant%20Coffee%20Roasters%2C%20539%20Valencia%20St%2C%20San%20Francisco%2C%20CA%2094110) | [sextant-valencia.jpg](../public/images/cafes/sextant-valencia.jpg) | 15,474 / `4bdb073c3a9c…` | 通过 |
| 29 | Highwire Coffee Roasters | 5615 College Ave, Oakland, CA 94618 | 4.6 | 188 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Highwire%20Coffee%20Roasters%2C%205615%20College%20Ave%2C%20Oakland%2C%20CA%2094618) | [highwire-rockridge.jpg](../public/images/cafes/highwire-rockridge.jpg) | 39,237 / `c070325915fc…` | 通过 |
| 30 | Highwire Coffee Roasters | 1234 Park St, Alameda, CA 94501 | 4.7 | 142 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Highwire%20Coffee%20Roasters%2C%201234%20Park%20St%2C%20Alameda%2C%20CA%2094501) | [highwire-alameda.jpg](../public/images/cafes/highwire-alameda.jpg) | 21,477 / `eea4b15b523e…` | 通过 |
| 31 | Highwire Coffee Roasters | 2059 Mountain Blvd, Oakland, CA 94611 | 4.5 | 120 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Highwire%20Coffee%20Roasters%2C%202059%20Mountain%20Blvd%2C%20Oakland%2C%20CA%2094611) | [highwire-montclair.jpg](../public/images/cafes/highwire-montclair.jpg) | 37,453 / `badf0286d0cb…` | 通过 |
| 32 | Timeless Coffee | 4252 Piedmont Ave, Oakland, CA 94611 | 4.5 | 1,034 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Timeless%20Coffee%2C%204252%20Piedmont%20Ave%2C%20Oakland%2C%20CA%2094611) | [timeless-piedmont.jpg](../public/images/cafes/timeless-piedmont.jpg) | 34,138 / `ab47d3761853…` | 通过 |
| 33 | Timeless Coffee | 1700 Webster St, Oakland, CA 94612 | 4.4 | 312 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Timeless%20Coffee%2C%201700%20Webster%20St%2C%20Oakland%2C%20CA%2094612) | [timeless-downtown.jpg](../public/images/cafes/timeless-downtown.jpg) | 21,582 / `f5a35ec0e036…` | 通过 |
| 34 | Bicycle Coffee | 377 2nd St #110, Oakland, CA 94607 | 4.6 | 520 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Bicycle%20Coffee%2C%20377%202nd%20St%20%23110%2C%20Oakland%2C%20CA%2094607) | [bicycle-coffee.jpg](../public/images/cafes/bicycle-coffee.jpg) | 36,913 / `ab8ca783c6f4…` | 通过 |
| 35 | Red Bay Coffee | 3098 E 10th St, Oakland, CA 94601 | 4.7 | 391 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Red%20Bay%20Coffee%2C%203098%20E%2010th%20St%2C%20Oakland%2C%20CA%2094601) | [red-bay.jpg](../public/images/cafes/red-bay.jpg) | 32,171 / `3e365de51d63…` | 通过 |
| 36 | Souvenir Coffee | 3084 Claremont Ave, Berkeley, CA 94705 | 4.5 | 230 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Souvenir%20Coffee%2C%203084%20Claremont%20Ave%2C%20Berkeley%2C%20CA%2094705) | [souvenir.jpg](../public/images/cafes/souvenir.jpg) | 24,399 / `6236c5bba327…` | 通过 |
| 37 | Bartavelle | 1621 San Pablo Ave, Berkeley, CA 94702 | 4.6 | 513 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Bartavelle%2C%201621%20San%20Pablo%20Ave%2C%20Berkeley%2C%20CA%2094702) | [bartavelle.jpg](../public/images/cafes/bartavelle.jpg) | 38,582 / `1e6e7283c956…` | 通过 |
| 38 | Backhaus | 32 E 3rd Ave, San Mateo, CA 94401 | 4.7 | 1,172 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Backhaus%2C%2032%20E%203rd%20Ave%2C%20San%20Mateo%2C%20CA%2094401) | [backhaus.jpg](../public/images/cafes/backhaus.jpg) | 26,613 / `980a3e186c19…` | 通过 |
| 39 | Backyard Brew | 444 California Ave, Palo Alto, CA 94306 | 4.7 | 1,360 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Backyard%20Brew%2C%20444%20California%20Ave%2C%20Palo%20Alto%2C%20CA%2094306) | [backyard-brew.jpg](../public/images/cafes/backyard-brew.jpg) | 32,302 / `fa26cdd1ffbb…` | 通过 |
| 40 | Coupa Cafe | 538 Ramona St, Palo Alto, CA 94301 | 4.3 | 1,660 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Coupa%20Cafe%2C%20538%20Ramona%20St%2C%20Palo%20Alto%2C%20CA%2094301) | [coupa-ramona.jpg](../public/images/cafes/coupa-ramona.jpg) | 28,623 / `8dfc5b615917…` | 通过 |
| 41 | Saint Frank Coffee | 1018 Alma St, Menlo Park, CA 94025 | 4.6 | 553 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Saint%20Frank%20Coffee%2C%201018%20Alma%20St%2C%20Menlo%20Park%2C%20CA%2094025) | [saint-frank-menlo.jpg](../public/images/cafes/saint-frank-menlo.jpg) | 49,824 / `134d7393ec8e…` | 通过 |
| 42 | Coffeebar | 1149 Chestnut St, Menlo Park, CA 94025 | 4.4 | 1,038 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Coffeebar%2C%201149%20Chestnut%20St%2C%20Menlo%20Park%2C%20CA%2094025) | [coffeebar-menlo.jpg](../public/images/cafes/coffeebar-menlo.jpg) | 25,189 / `f5ce511ec51b…` | 通过 |
| 43 | Cafe Borrone | 1010 El Camino Real, Menlo Park, CA 94025 | 4.4 | 1,809 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Cafe%20Borrone%2C%201010%20El%20Camino%20Real%2C%20Menlo%20Park%2C%20CA%2094025) | [cafe-borrone.jpg](../public/images/cafes/cafe-borrone.jpg) | 21,603 / `956442565e61…` | 通过 |
| 44 | Academic Coffee | 499 S Second St, San Jose, CA 95113 | 4.5 | 777 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Academic%20Coffee%2C%20499%20S%20Second%20St%2C%20San%20Jose%2C%20CA%2095113) | [academic.jpg](../public/images/cafes/academic.jpg) | 28,435 / `9395f364e626…` | 通过 |
| 45 | Voltaire Coffee Roasters | 360 S Market St, San Jose, CA 95113 | 4.5 | 796 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Voltaire%20Coffee%20Roasters%2C%20360%20S%20Market%20St%2C%20San%20Jose%2C%20CA%2095113) | [voltaire.jpg](../public/images/cafes/voltaire.jpg) | 24,955 / `e1c51733c4ef…` | 通过 |
| 46 | Moonwake Coffee Roasters | 1412 Saratoga Ave, San Jose, CA 95129 | 4.7 | 868 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Moonwake%20Coffee%20Roasters%2C%201412%20Saratoga%20Ave%2C%20San%20Jose%2C%20CA%2095129) | [moonwake.jpg](../public/images/cafes/moonwake.jpg) | 31,286 / `54a7f1b015a0…` | 通过 |
| 47 | Lookout Coffee | 2135 S Winchester Blvd Suite 100, Campbell, CA 95008 | 4.7 | 538 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Lookout%20Coffee%2C%202135%20S%20Winchester%20Blvd%20Suite%20100%2C%20Campbell%2C%20CA%2095008) | [lookout.jpg](../public/images/cafes/lookout.jpg) | 22,482 / `89f2e55d2b89…` | 通过 |
| 48 | Coffee & Water Lab | 603 Saratoga Ave #40, San Jose, CA 95129 | 4.5 | 844 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Coffee%20%26%20Water%20Lab%2C%20603%20Saratoga%20Ave%20%2340%2C%20San%20Jose%2C%20CA%2095129) | [coffee-water-lab.jpg](../public/images/cafes/coffee-water-lab.jpg) | 19,884 / `5e535812a10b…` | 通过 |
| 49 | Red Whale Coffee | 169 Paul Dr, San Rafael, CA 94903 | 4.5 | 1,043 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Red%20Whale%20Coffee%2C%20169%20Paul%20Dr%2C%20San%20Rafael%2C%20CA%2094903) | [red-whale.jpg](../public/images/cafes/red-whale.jpg) | 28,954 / `7e3a0b206641…` | 通过 |
| 50 | Equator Coffees | 1201 Bridgeway, Sausalito, CA 94965 | 4.3 | 941 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Equator%20Coffees%2C%201201%20Bridgeway%2C%20Sausalito%2C%20CA%2094965) | [equator-sausalito.jpg](../public/images/cafes/equator-sausalito.jpg) | 39,454 / `1f50242579d7…` | 通过 |
| 51 | Blue Bottle Coffee | 66 Mint St, San Francisco, CA 94103 | 4.4 | 2,852 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Blue%20Bottle%20Coffee%2C%2066%20Mint%20St%2C%20San%20Francisco%2C%20CA%2094103) | [blue-bottle-mint.jpg](../public/images/cafes/blue-bottle-mint.jpg) | 25,609 / `f09c68c9a93a…` | 通过 |
| 52 | Reveille Coffee | 200 Columbus Ave, San Francisco, CA 94133 | 4.3 | 995 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Reveille%20Coffee%2C%20200%20Columbus%20Ave%2C%20San%20Francisco%2C%20CA%2094133) | [reveille-north-beach.jpg](../public/images/cafes/reveille-north-beach.jpg) | 27,451 / `bb48cf391294…` | 通过 |
| 53 | Caffe Trieste | 601 Vallejo St, San Francisco, CA 94133 | 4.4 | 1,938 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Caffe%20Trieste%2C%20601%20Vallejo%20St%2C%20San%20Francisco%2C%20CA%2094133) | [caffe-trieste.jpg](../public/images/cafes/caffe-trieste.jpg) | 37,708 / `d8f2d7330a30…` | 通过 |
| 54 | The Caffè by Mr. Espresso | 1120 Broadway, Oakland, CA 94607 | 4.8 | 305 | [Google Maps](https://www.google.com/maps/search/?api=1&query=The%20Caff%C3%A8%20by%20Mr.%20Espresso%2C%201120%20Broadway%2C%20Oakland%2C%20CA%2094607) | [mr-espresso.jpg](../public/images/cafes/mr-espresso.jpg) | 28,406 / `856a690c94e4…` | 通过 |
| 55 | Grand Coffee | 2663 Mission St, San Francisco, CA 94110 | 4.6 | 145 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Grand%20Coffee%2C%202663%20Mission%20St%2C%20San%20Francisco%2C%20CA%2094110) | [grand-coffee.jpg](../public/images/cafes/grand-coffee.jpg) | 39,896 / `68bda83d2952…` | 通过 |
| 56 | Obsequent Coffee | 2700 16th St, San Francisco, CA 94103 | 4.4 | 70 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Obsequent%20Coffee%2C%202700%2016th%20St%2C%20San%20Francisco%2C%20CA%2094103) | [obsequent-sf.jpg](../public/images/cafes/obsequent-sf.jpg) | 28,798 / `d58fd0eb67dd…` | 通过 |
| 57 | Verve Coffee Roasters | 2101 Market St, San Francisco, CA 94114 | 4.4 | 1,097 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Verve%20Coffee%20Roasters%2C%202101%20Market%20St%2C%20San%20Francisco%2C%20CA%2094114) | [verve-mission.jpg](../public/images/cafes/verve-mission.jpg) | 29,700 / `34f5153c0012…` | 通过 |
| 58 | Delah Coffee | 370 4th St, San Francisco, CA 94107 | 4.6 | 1,372 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Delah%20Coffee%2C%20370%204th%20St%2C%20San%20Francisco%2C%20CA%2094107) | [sf-delah.jpg](../public/images/cafes/sf-delah.jpg) | 37,380 / `965031d0592f…` | 通过 |
| 59 | Juniper | 1401 Polk St, San Francisco, CA 94109 | 4.7 | 983 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Juniper%2C%201401%20Polk%20St%2C%20San%20Francisco%2C%20CA%2094109) | [sf-juniper.jpg](../public/images/cafes/sf-juniper.jpg) | 18,435 / `39a3753a4d38…` | 通过 |
| 60 | Doppio Coffee & Brunch | 1551 Mission St, San Francisco, CA 94103 | 4.8 | 559 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Doppio%20Coffee%20%26%20Brunch%2C%201551%20Mission%20St%2C%20San%20Francisco%2C%20CA%2094103) | [sf-doppio.jpg](../public/images/cafes/sf-doppio.jpg) | 22,804 / `5cb7e7c6a7e6…` | 通过 |
| 61 | Hedge Coffee | 434 Shotwell St, San Francisco, CA 94110 | 4.6 | 554 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Hedge%20Coffee%2C%20434%20Shotwell%20St%2C%20San%20Francisco%2C%20CA%2094110) | [sf-hedge.jpg](../public/images/cafes/sf-hedge.jpg) | 19,860 / `c44a6934c318…` | 通过 |
| 62 | The Coffee Berry SF | 1410 Lombard St, San Francisco, CA 94123 | 4.9 | 381 | [Google Maps](https://www.google.com/maps/search/?api=1&query=The%20Coffee%20Berry%20SF%2C%201410%20Lombard%20St%2C%20San%20Francisco%2C%20CA%2094123) | [sf-coffee-berry.jpg](../public/images/cafes/sf-coffee-berry.jpg) | 21,376 / `e9f8446e1704…` | 通过 |
| 63 | Telescope Coffee | 345 6th St, San Francisco, CA 94103 | 4.6 | 347 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Telescope%20Coffee%2C%20345%206th%20St%2C%20San%20Francisco%2C%20CA%2094103) | [sf-telescope.jpg](../public/images/cafes/sf-telescope.jpg) | 37,455 / `6472a2d809a9…` | 通过 |
| 64 | Golden Goat Coffee | 599 3rd St #100, San Francisco, CA 94107 | 4.8 | 342 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Golden%20Goat%20Coffee%2C%20599%203rd%20St%20%23100%2C%20San%20Francisco%2C%20CA%2094107) | [sf-golden-goat.jpg](../public/images/cafes/sf-golden-goat.jpg) | 24,751 / `27a2091fab12…` | 通过 |
| 65 | Abanico Coffee Roasters | 2121 Mission St, San Francisco, CA 94110 | 4.6 | 342 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Abanico%20Coffee%20Roasters%2C%202121%20Mission%20St%2C%20San%20Francisco%2C%20CA%2094110) | [sf-abanico.jpg](../public/images/cafes/sf-abanico.jpg) | 41,665 / `293f24b1175d…` | 通过 |
| 66 | Belmo Café | 1160 University Ave, Berkeley, CA 94702 | 4.8 | 709 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Belmo%20Caf%C3%A9%2C%201160%20University%20Ave%2C%20Berkeley%2C%20CA%2094702) | [east-belmo.jpg](../public/images/cafes/east-belmo.jpg) | 29,860 / `92999d75d549…` | 通过 |
| 67 | Delah Coffee | 420 W Grand Ave, Oakland, CA 94612 | 4.6 | 750 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Delah%20Coffee%2C%20420%20W%20Grand%20Ave%2C%20Oakland%2C%20CA%2094612) | [east-delah.jpg](../public/images/cafes/east-delah.jpg) | 22,785 / `a3eefe8c1541…` | 通过 |
| 68 | Sana'a Cafe | 801 Broadway, Oakland, CA 94607 | 4.7 | 576 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Sana'a%20Cafe%2C%20801%20Broadway%2C%20Oakland%2C%20CA%2094607) | [east-sanaa-broadway.jpg](../public/images/cafes/east-sanaa-broadway.jpg) | 21,704 / `77932f82e2f2…` | 通过 |
| 69 | Victory Point Cafe | 1797 Shattuck Ave. Ste A, Berkeley, CA 94709 | 4.7 | 471 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Victory%20Point%20Cafe%2C%201797%20Shattuck%20Ave.%20Ste%20A%2C%20Berkeley%2C%20CA%2094709) | [east-victory-point.jpg](../public/images/cafes/east-victory-point.jpg) | 26,637 / `1cd9a463dfbe…` | 通过 |
| 70 | MY Coffee Roastery | 2080 Martin Luther King Jr Way, Berkeley, CA 94704 | 4.7 | 434 | [Google Maps](https://www.google.com/maps/search/?api=1&query=MY%20Coffee%20Roastery%2C%202080%20Martin%20Luther%20King%20Jr%20Way%2C%20Berkeley%2C%20CA%2094704) | [east-my-coffee.jpg](../public/images/cafes/east-my-coffee.jpg) | 20,353 / `cde23c9ffbed…` | 通过 |
| 71 | Roast & Toast Cafe | 1746 Shattuck Ave., Berkeley, CA 94709 | 4.8 | 430 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Roast%20%26%20Toast%20Cafe%2C%201746%20Shattuck%20Ave.%2C%20Berkeley%2C%20CA%2094709) | [east-roast-toast.jpg](../public/images/cafes/east-roast-toast.jpg) | 46,098 / `6c8f56bfa790…` | 通过 |
| 72 | Jaffa Coffee Roasters | 1701 University Ave, Berkeley, CA 94703 | 4.7 | 390 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Jaffa%20Coffee%20Roasters%2C%201701%20University%20Ave%2C%20Berkeley%2C%20CA%2094703) | [east-jaffa.jpg](../public/images/cafes/east-jaffa.jpg) | 41,113 / `b94915b37e62…` | 通过 |
| 73 | Mohka House | 2139 MacArthur Blvd, Oakland, CA 94602 | 4.9 | 370 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Mohka%20House%2C%202139%20MacArthur%20Blvd%2C%20Oakland%2C%20CA%2094602) | [east-mohka.jpg](../public/images/cafes/east-mohka.jpg) | 25,529 / `ee2424c37664…` | 通过 |
| 74 | Heyma Yemeni Coffee | 1122 University Ave, Berkeley, CA 94702 | 4.7 | 360 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Heyma%20Yemeni%20Coffee%2C%201122%20University%20Ave%2C%20Berkeley%2C%20CA%2094702) | [east-heyma.jpg](../public/images/cafes/east-heyma.jpg) | 35,935 / `16bf4df5817c…` | 通过 |
| 75 | Ain't Normal Cafe | 5701 College Ave, Oakland, CA 94618 | 4.5 | 333 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Ain't%20Normal%20Cafe%2C%205701%20College%20Ave%2C%20Oakland%2C%20CA%2094618) | [east-aint-normal.jpg](../public/images/cafes/east-aint-normal.jpg) | 21,643 / `8078d1b8251f…` | 通过 |
| 76 | ZombieRunner Coffee | 344 California Ave, Palo Alto, CA 94306 | 4.6 | 337 | [Google Maps](https://www.google.com/maps/search/?api=1&query=ZombieRunner%20Coffee%2C%20344%20California%20Ave%2C%20Palo%20Alto%2C%20CA%2094306) | [peninsula-zombierunner.jpg](../public/images/cafes/peninsula-zombierunner.jpg) | 37,785 / `b608918bde3f…` | 通过 |
| 77 | 1 Oz Coffee | 650 Castro St #130, Mountain View, CA 94041 | 4.5 | 1,114 | [Google Maps](https://www.google.com/maps/search/?api=1&query=1%20Oz%20Coffee%2C%20650%20Castro%20St%20%23130%2C%20Mountain%20View%2C%20CA%2094041) | [peninsula-one-oz.jpg](../public/images/cafes/peninsula-one-oz.jpg) | 19,279 / `f9fd13fbba9a…` | 通过 |
| 78 | KAIZEN & COFFEE | 2337 S El Camino Real, San Mateo, CA 94403 | 4.8 | 683 | [Google Maps](https://www.google.com/maps/search/?api=1&query=KAIZEN%20%26%20COFFEE%2C%202337%20S%20El%20Camino%20Real%2C%20San%20Mateo%2C%20CA%2094403) | [peninsula-kaizen.jpg](../public/images/cafes/peninsula-kaizen.jpg) | 14,954 / `b67c8c7dde9f…` | 通过 |
| 79 | Fiero Caffe | 106 S El Camino Real, San Mateo, CA 94401 | 4.7 | 610 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Fiero%20Caffe%2C%20106%20S%20El%20Camino%20Real%2C%20San%20Mateo%2C%20CA%2094401) | [peninsula-fiero.jpg](../public/images/cafes/peninsula-fiero.jpg) | 19,412 / `7a6773b5de5f…` | 通过 |
| 80 | Cloud9 Coffee | 1901 Embarcadero Rd #103, Palo Alto, CA 94303 | 4.7 | 473 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Cloud9%20Coffee%2C%201901%20Embarcadero%20Rd%20%23103%2C%20Palo%20Alto%2C%20CA%2094303) | [peninsula-cloud9.jpg](../public/images/cafes/peninsula-cloud9.jpg) | 26,913 / `dce16f2bcf03…` | 通过 |
| 81 | Little Late Bird | 777 Mariners Island Blvd Ste 170, San Mateo, CA 94404 | 4.7 | 441 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Little%20Late%20Bird%2C%20777%20Mariners%20Island%20Blvd%20Ste%20170%2C%20San%20Mateo%2C%20CA%2094404) | [peninsula-little-late-bird.jpg](../public/images/cafes/peninsula-little-late-bird.jpg) | 24,838 / `85ff451c705b…` | 通过 |
| 82 | SANA'A CAFE | 2400 Broadway Ste 120, Redwood City, CA 94063 | 4.7 | 442 | [Google Maps](https://www.google.com/maps/search/?api=1&query=SANA'A%20CAFE%2C%202400%20Broadway%20Ste%20120%2C%20Redwood%20City%2C%20CA%2094063) | [peninsula-sanaa.jpg](../public/images/cafes/peninsula-sanaa.jpg) | 11,668 / `c8332ee6a1c8…` | 通过 |
| 83 | Cappucho Cafe & Coffee Roaster | 1180 Main St, Redwood City, CA 94063 | 4.9 | 302 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Cappucho%20Cafe%20%26%20Coffee%20Roaster%2C%201180%20Main%20St%2C%20Redwood%20City%2C%20CA%2094063) | [peninsula-cappucho.jpg](../public/images/cafes/peninsula-cappucho.jpg) | 13,395 / `bdeec8cf9010…` | 通过 |
| 84 | The Yard Coffee | 1018 Main St, Redwood City, CA 94063 | 4.8 | 245 | [Google Maps](https://www.google.com/maps/search/?api=1&query=The%20Yard%20Coffee%2C%201018%20Main%20St%2C%20Redwood%20City%2C%20CA%2094063) | [peninsula-yard.jpg](../public/images/cafes/peninsula-yard.jpg) | 23,095 / `e7a06d15a1d4…` | 通过 |
| 85 | Brew Coffee and Bakery | 3176 Middlefield Rd, Redwood City, CA 94063 | 4.8 | 240 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Brew%20Coffee%20and%20Bakery%2C%203176%20Middlefield%20Rd%2C%20Redwood%20City%2C%20CA%2094063) | [peninsula-brew.jpg](../public/images/cafes/peninsula-brew.jpg) | 16,116 / `8b7a8736fd12…` | 通过 |
| 86 | Jiaren Cafe: Coffee, Boba & Events | 1171 Homestead Rd #140b, Santa Clara, CA 95050 | 4.6 | 3,490 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Jiaren%20Cafe%3A%20Coffee%2C%20Boba%20%26%20Events%2C%201171%20Homestead%20Rd%20%23140b%2C%20Santa%20Clara%2C%20CA%2095050) | [south-jiaren.jpg](../public/images/cafes/south-jiaren.jpg) | 20,476 / `2057d02c1c90…` | 通过 |
| 87 | Roy's Station Coffee & Tea | 197 Jackson St, San Jose, CA 95112 | 4.6 | 1,108 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Roy's%20Station%20Coffee%20%26%20Tea%2C%20197%20Jackson%20St%2C%20San%20Jose%2C%20CA%2095112) | [south-roys.jpg](../public/images/cafes/south-roys.jpg) | 21,390 / `429fcbf8660c…` | 通过 |
| 88 | Bavetta Coffee | 754 The Alameda #80, San Jose, CA 95126 | 4.5 | 849 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Bavetta%20Coffee%2C%20754%20The%20Alameda%20%2380%2C%20San%20Jose%2C%20CA%2095126) | [south-bavetta.jpg](../public/images/cafes/south-bavetta.jpg) | 30,730 / `e94a03d0cecb…` | 通过 |
| 89 | Chromatic Coffee Co. | 460 Lincoln Ave #10, San Jose, CA 95126 | 4.5 | 802 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Chromatic%20Coffee%20Co.%2C%20460%20Lincoln%20Ave%20%2310%2C%20San%20Jose%2C%20CA%2095126) | [south-chromatic.jpg](../public/images/cafes/south-chromatic.jpg) | 21,658 / `83f084e279ba…` | 通过 |
| 90 | Dr.ink | 77 N Almaden Ave #70, San Jose, CA 95110 | 4.6 | 773 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Dr.ink%2C%2077%20N%20Almaden%20Ave%20%2370%2C%20San%20Jose%2C%20CA%2095110) | [south-drink.jpg](../public/images/cafes/south-drink.jpg) | 30,581 / `2eb0d7eb9150…` | 通过 |
| 91 | Nabi Cat Cafe | 2255 The Alameda, Santa Clara, CA 95050 | 4.7 | 490 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Nabi%20Cat%20Cafe%2C%202255%20The%20Alameda%2C%20Santa%20Clara%2C%20CA%2095050) | [south-nabi.jpg](../public/images/cafes/south-nabi.jpg) | 17,120 / `f88e8ab9ffa8…` | 通过 |
| 92 | Dumont Creamery & Café | 28 N Almaden Ave Ste 40, San Jose, CA 95110 | 4.7 | 459 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Dumont%20Creamery%20%26%20Caf%C3%A9%2C%2028%20N%20Almaden%20Ave%20Ste%2040%2C%20San%20Jose%2C%20CA%2095110) | [south-dumont.jpg](../public/images/cafes/south-dumont.jpg) | 24,488 / `2a5e0bcb5603…` | 通过 |
| 93 | MoonBean's Coffee | 6219 Santa Teresa Blvd, San Jose, CA 95119 | 4.6 | 353 | [Google Maps](https://www.google.com/maps/search/?api=1&query=MoonBean's%20Coffee%2C%206219%20Santa%20Teresa%20Blvd%2C%20San%20Jose%2C%20CA%2095119) | [south-moonbeans.jpg](../public/images/cafes/south-moonbeans.jpg) | 33,494 / `8e7283622761…` | 通过 |
| 94 | A.M. Craft | 481 E San Carlos St, San Jose, CA 95112 | 4.8 | 282 | [Google Maps](https://www.google.com/maps/search/?api=1&query=A.M.%20Craft%2C%20481%20E%20San%20Carlos%20St%2C%20San%20Jose%2C%20CA%2095112) | [south-am-craft.jpg](../public/images/cafes/south-am-craft.jpg) | 44,939 / `1bfa2d7ea6fc…` | 通过 |
| 95 | Qishr Coffee House | 90 Skyport Dr #140, San Jose, CA 95110 | 4.7 | 262 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Qishr%20Coffee%20House%2C%2090%20Skyport%20Dr%20%23140%2C%20San%20Jose%2C%20CA%2095110) | [south-qishr.jpg](../public/images/cafes/south-qishr.jpg) | 36,602 / `a4f872b708ac…` | 通过 |
| 96 | Firehouse Coffee & Tea | 317 Johnson St, Sausalito, CA 94965 | 4.7 | 522 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Firehouse%20Coffee%20%26%20Tea%2C%20317%20Johnson%20St%2C%20Sausalito%2C%20CA%2094965) | [marin-firehouse.jpg](../public/images/cafes/marin-firehouse.jpg) | 17,236 / `0107838586de…` | 通过 |
| 97 | Sana'a Cafe | 1146 4th St, San Rafael, CA 94901 | 4.8 | 305 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Sana'a%20Cafe%2C%201146%204th%20St%2C%20San%20Rafael%2C%20CA%2094901) | [marin-sanaa.jpg](../public/images/cafes/marin-sanaa.jpg) | 23,671 / `e123927e7dc8…` | 通过 |
| 98 | Franko & Coffee | 721 Bridgeway, Sausalito, CA 94965 | 4.7 | 314 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Franko%20%26%20Coffee%2C%20721%20Bridgeway%2C%20Sausalito%2C%20CA%2094965) | [marin-franko.jpg](../public/images/cafes/marin-franko.jpg) | 16,264 / `64bb4cd14187…` | 通过 |
| 99 | Kamson Coffee | 819 Francisco Blvd W, San Rafael, CA 94901 | 4.8 | 135 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Kamson%20Coffee%2C%20819%20Francisco%20Blvd%20W%2C%20San%20Rafael%2C%20CA%2094901) | [marin-kamson.jpg](../public/images/cafes/marin-kamson.jpg) | 18,614 / `b24a23b0caee…` | 通过 |
| 100 | Marin Coffee Roasters | 466 Ignacio Blvd, Novato, CA 94949 | 4.6 | 132 | [Google Maps](https://www.google.com/maps/search/?api=1&query=Marin%20Coffee%20Roasters%2C%20466%20Ignacio%20Blvd%2C%20Novato%2C%20CA%2094949) | [marin-coffee-roasters.jpg](../public/images/cafes/marin-coffee-roasters.jpg) | 20,578 / `b9d751d11382…` | 通过 |

## 应用回归验证

- 生产构建：`npm run build` 通过。
- 数据一致性：100 个门店 ID、100 个本地图片文件完全对应；路线中不存在悬空 ID。
- 图片请求：浏览器逐项请求 100 个本地图片 URL，全部返回 HTTP 200、图片 MIME 且文件大于 10 KB。
- 桌面与移动端：初始门店数 100；评分与评分数均显示；搜索 Ritual 后为 1。
- 渲染检查：筛选后的卡片图和地图详情图均完成同步解码并实际绘制；桌面、移动端截图无控制台或页面错误。
- 回归截图：[desktop-latest.png](../.checks/desktop-latest.png)、[mobile-latest.png](../.checks/mobile-latest.png)

## 可复现材料

- Google Maps 原始抓取：[google-maps-raw.json](./google-maps-raw.json)
- 285 家候选池：[google-maps-candidate-pool.json](./google-maps-candidate-pool.json)
- 新增 43 家完整证据：[selected-43-google-maps.json](./selected-43-google-maps.json)
- 现有 57 家评分数复核：[current-google-details.json](./current-google-details.json)
- 最终门店快照：[current-place-snapshots.json](./current-place-snapshots.json)
- 图片哈希清单：[image-manifest.json](./image-manifest.json)
- 原 57 图联系表：[image-contact-sheet.jpg](./image-contact-sheet.jpg)
- 新增 43 图联系表：[selected-43-contact-sheet.jpg](./selected-43-contact-sheet.jpg)
- 新增图片哈希清单：[selected-43-image-manifest.json](./selected-43-image-manifest.json)
- 核验脚本：[verify-places.mjs](../scripts/verify-places.mjs)、[collect-current-places.mjs](../scripts/collect-current-places.mjs)
- 扩展与复核脚本：[discover-google-candidates.mjs](../scripts/discover-google-candidates.mjs)、[refresh-current-google-details.mjs](../scripts/refresh-current-google-details.mjs)、[expand-to-100.mjs](../scripts/expand-to-100.mjs)、[download-selected-images.mjs](../scripts/download-selected-images.mjs)
