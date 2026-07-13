import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import {
  BriefcaseBusiness,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Cookie,
  ExternalLink,
  Factory,
  Flame,
  Fuel,
  GraduationCap,
  Landmark,
  Laptop,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TrainFront,
  TramFront,
  Users,
  Waves,
  X
} from "lucide-react";
import { cafes, dataUpdatedAt, regionOptions, tagOptions } from "./data.js";
import { imageAtlas } from "./imageAtlas.js";
import { photoData } from "./photoData.js";

const numberedCafes = cafes.map((cafe, index) => ({ ...cafe, number: index + 1 }));
const regionLabels = Object.fromEntries(regionOptions.map(region => [region.id, region.label]));
const tagLabels = Object.fromEntries(tagOptions.map(tag => [tag.id, tag.label]));

const parkingLevels = {
  easy: { label: "容易", tone: "easy", dots: 1 },
  moderate: { label: "一般", tone: "moderate", dots: 2 },
  hard: { label: "困难", tone: "hard", dots: 3 }
};

const hardParkingAreas = [
  "SoMa", "Mission", "Russian Hill", "North Beach", "Chinatown", "Hayes Valley",
  "Financial District", "Downtown SF", "Downtown Oakland", "Uptown", "Downtown Berkeley",
  "Downtown San Jose", "Downtown Palo Alto", "Castro", "Marina", "Nob Hill"
];

const easyParkingAreas = [
  "Fairfax", "San Rafael", "Mill Valley", "Larkspur", "Novato", "Los Gatos",
  "Saratoga", "Campbell", "Santa Clara", "Redwood Shores", "Alameda", "Pacifica",
  "Half Moon Bay", "Pescadero", "Davenport", "Moss Landing"
];

function parkingDifficulty(cafe) {
  const place = `${cafe.neighborhood} ${cafe.city}`;
  if (cafe.region === "sf" && cafe.neighborhood !== "Outer Sunset") return parkingLevels.hard;
  if (hardParkingAreas.some(area => place.includes(area))) return parkingLevels.hard;
  if (easyParkingAreas.some(area => place.includes(area))) return parkingLevels.easy;
  if (cafe.region === "marin") return parkingLevels.easy;
  return parkingLevels.moderate;
}

const preferenceGroups = [
  {
    id: "coffee",
    label: "咖啡偏好",
    options: [
      { id: "coffee-serious", label: "认真喝", icon: "coffee", tags: ["serious", "roaster"] },
      { id: "coffee-specialty", label: "特色风味", icon: "flame", tags: ["specialty"] }
    ]
  },
  {
    id: "occasion",
    label: "使用场景",
    options: [
      { id: "occasion-work", label: "工作短会", icon: "laptop", tags: ["work", "quiet"] },
      { id: "occasion-social", label: "聊天约会", icon: "users", tags: ["lively", "date", "neighborhood"] },
      { id: "occasion-quick", label: "快取转场", icon: "train-front", tags: ["quick"] }
    ]
  },
  {
    id: "experience",
    label: "顺路体验",
    options: [
      { id: "experience-food", label: "甜点早午餐", icon: "cookie", tags: ["pastry", "brunch"] },
      { id: "experience-ocean", label: "直接看海", icon: "waves", tags: ["ocean-view"] },
      { id: "experience-outdoor", label: "户外风景", icon: "waves", tags: ["outdoor", "scenic"] },
      { id: "experience-heritage", label: "老派经典", icon: "coffee", tags: ["heritage"] }
    ]
  }
];

const parkingOptions = Object.entries(parkingLevels).map(([id, value]) => ({
  id,
  label: `停车${value.label}`,
  icon: "car-front"
}));

const nearbyCategoryConfig = [
  { key: "groceries", category: "grocery", label: "超市与杂货", shortLabel: "超市 / 杂货", icon: "map-pin", marker: "购" },
  { key: "transit", category: "transit", label: "公交与轨道", shortLabel: "公交 / 轨道", icon: "train-front", marker: "站" },
  { key: "gasStations", category: "gas", label: "加油站", shortLabel: "加油站", icon: "fuel", marker: "油" },
  { key: "schools", category: "school", label: "学校", shortLabel: "学校", icon: "graduation-cap", marker: "学" },
  { key: "attractions", category: "attraction", label: "景点与公园", shortLabel: "景点 / 公园", icon: "landmark", marker: "景" }
];

function allNearbyPlaces(cafe) {
  return nearbyCategoryConfig.flatMap(config => cafe.nearbyPlaces?.[config.key] ?? []);
}

function nearbyConfigFor(place) {
  return nearbyCategoryConfig.find(config => config.category === place.category) ?? nearbyCategoryConfig[0];
}

function toggleArrayValue(setter, value) {
  setter(current => current.includes(value)
    ? current.filter(item => item !== value)
    : [...current, value]);
}

function getThunderforestApiKey() {
  const envKey = import.meta.env.VITE_THUNDERFOREST_API_KEY?.trim();
  if (typeof window === "undefined") return envKey;

  const queryKey = new URLSearchParams(window.location.search).get("tfkey")?.trim();
  if (queryKey) {
    try {
      window.localStorage.setItem("thunderforestApiKey", queryKey);
    } catch {
      // Ignore storage failures; the key can still be used for this page load.
    }
    return queryKey;
  }

  try {
    return window.localStorage.getItem("thunderforestApiKey")?.trim() || envKey;
  } catch {
    return envKey;
  }
}

const thunderforestApiKey = getThunderforestApiKey();
const mapTileConfig = thunderforestApiKey
  ? {
      url: `https://api.thunderforest.com/pioneer/{z}/{x}/{y}.png?apikey=${encodeURIComponent(thunderforestApiKey)}`,
      options: {
        maxZoom: 18,
        attribution:
          'Maps &copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      }
    }
  : {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      options: {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    };
const mapAttributionText = thunderforestApiKey
  ? "地图底图 © Thunderforest / OpenStreetMap contributors"
  : "地图底图 © OpenStreetMap contributors";

const iconMap = {
  "briefcase-business": BriefcaseBusiness,
  "car-front": CarFront,
  clock: Clock,
  coffee: Coffee,
  cookie: Cookie,
  "external-link": ExternalLink,
  factory: Factory,
  flame: Flame,
  fuel: Fuel,
  "graduation-cap": GraduationCap,
  landmark: Landmark,
  laptop: Laptop,
  "locate-fixed": LocateFixed,
  map: MapIcon,
  "map-pin": MapPin,
  "maximize-2": Maximize2,
  "minimize-2": Minimize2,
  navigation: Navigation,
  search: Search,
  "sliders-horizontal": SlidersHorizontal,
  sparkles: Sparkles,
  sun: Sun,
  "train-front": TrainFront,
  "tram-front": TramFront,
  users: Users,
  waves: Waves
};

iconMap["chevron-left"] = ChevronLeft;
iconMap["chevron-right"] = ChevronRight;
iconMap.x = X;

function Icon({ name }) {
  const Component = iconMap[name] || Coffee;
  return <Component aria-hidden="true" />;
}

function directionsUrl(cafe) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cafe.address)}`;
}

function nearbyMapsUrl(place) {
  const params = new URLSearchParams({
    api: "1",
    query: [place.name, place.address].filter(Boolean).join(", ") || place.coords.join(",")
  });
  if (place.id) params.set("query_place_id", place.id);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function distanceInMiles(origin, cafe) {
  if (!origin) return Number.POSITIVE_INFINITY;

  const toRad = value => (value * Math.PI) / 180;
  const [lat, lng] = cafe.coords;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(lat - origin.lat);
  const dLng = toRad(lng - origin.lng);
  const lat1 = toRad(origin.lat);
  const lat2 = toRad(lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function cafeSearchText(cafe) {
  const nearbyNames = allNearbyPlaces(cafe).map(place => place.name);
  return [
    cafe.name,
    cafe.city,
    cafe.neighborhood,
    cafe.address,
    cafe.signature,
    cafe.note,
    cafe.vibe,
    regionLabels[cafe.region],
    ...cafe.tags.map(tag => tagLabels[tag] || tag),
    ...nearbyNames
  ]
    .join(" ")
    .toLowerCase();
}

function cafeIntro(cafe) {
  return cafe.vibe;
}

function formatNearbyDistance(meters) {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function businessStatusLabel(status) {
  if (status === "CLOSED_TEMPORARILY") return "暂时停业";
  if (status === "CLOSED_PERMANENTLY") return "永久停业";
  return null;
}

const weekDays = [
  { day: 1, label: "一" },
  { day: 2, label: "二" },
  { day: 3, label: "三" },
  { day: 4, label: "四" },
  { day: 5, label: "五" },
  { day: 6, label: "六" },
  { day: 0, label: "日" }
];

function openingSegmentsByDay(periods = []) {
  const segments = Array.from({ length: 7 }, () => []);
  for (const period of periods) {
    if (!period.open) continue;
    const start = period.open.day * 1440 + period.open.hour * 60 + (period.open.minute ?? 0);
    let end;
    if (!period.close) {
      end = start + 7 * 1440;
    } else {
      end = period.close.day * 1440 + period.close.hour * 60 + (period.close.minute ?? 0);
      if (end <= start) end += 7 * 1440;
    }
    for (let absoluteDay = Math.floor(start / 1440); absoluteDay <= Math.floor((end - 1) / 1440); absoluteDay += 1) {
      const dayStart = absoluteDay * 1440;
      const segmentStart = Math.max(start, dayStart) - dayStart;
      const segmentEnd = Math.min(end, dayStart + 1440) - dayStart;
      segments[((absoluteDay % 7) + 7) % 7].push({ start: segmentStart, end: segmentEnd });
    }
  }
  return segments;
}

function compactHoursText(description = "") {
  return description.replace(/^[^:：]+[:：]\s*/, "");
}

function OpeningHours({ cafe }) {
  const status = businessStatusLabel(cafe.placeBusinessStatus);
  const descriptions = cafe.regularOpeningHours?.weekdayDescriptions ?? [];
  const segments = openingSegmentsByDay(cafe.regularOpeningHours?.periods);
  if (!status && !descriptions.length) return null;

  return (
    <details className="detail-context detail-hours">
      <summary>
        <Icon name="clock" />
        <span>营业时间</span>
        {status ? <strong className="context-status">{status}</strong> : null}
      </summary>
      {descriptions.length ? (
        <div className="hours-chart" aria-label="一周营业时间图">
          <div className="hours-axis" aria-hidden="true">
            <span>0</span><span>6</span><span>12</span><span>18</span><span>24</span>
          </div>
          {weekDays.map((weekday, index) => {
            const description = descriptions[index] ?? "";
            return (
              <div className="hours-row" key={weekday.day} title={description}>
                <b>{weekday.label}</b>
                <div className="hours-track">
                  {segments[weekday.day].map((segment, segmentIndex) => (
                    <i
                      key={`${segment.start}-${segment.end}-${segmentIndex}`}
                      style={{
                        left: `${(segment.start / 1440) * 100}%`,
                        width: `${((segment.end - segment.start) / 1440) * 100}%`
                      }}
                    />
                  ))}
                </div>
                <small>{compactHoursText(description) || "休息"}</small>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="context-empty">Google 暂无常规营业时间</p>
      )}
    </details>
  );
}

function NearbyGroup({ icon, label, places }) {
  if (!places.length) return null;
  return (
    <div className="nearby-group">
      <h4><Icon name={icon} />{label}</h4>
      <ul>
        {places.map(place => (
          <li key={place.id}>
            <a href={nearbyMapsUrl(place)} target="_blank" rel="noopener noreferrer">
              <span>{place.name}</span>
              <small>{formatNearbyDistance(place.distanceMeters)}</small>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NearbyPlaces({ cafe }) {
  const nearby = allNearbyPlaces(cafe);
  if (!nearby.length) return null;
  return (
    <details className="detail-context detail-nearby">
      <summary>
        <Icon name="map-pin" />
        <span>附近地点</span>
        <strong>{nearby.length}</strong>
      </summary>
      <div className="nearby-groups">
        {nearbyCategoryConfig.map(config => (
          <NearbyGroup
            key={config.key}
            icon={config.icon}
            label={config.label}
            places={cafe.nearbyPlaces?.[config.key] ?? []}
          />
        ))}
      </div>
    </details>
  );
}

function StarRating({ rating, ratingCount }) {
  const normalizedRating = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <>
      <span className="stars" role="img" aria-label={`${normalizedRating} 星（满分 5 星）`}>
        <span className="stars-base" aria-hidden="true">★★★★★</span>
        <span className="stars-fill" aria-hidden="true" style={{ width: `${(normalizedRating / 5) * 100}%` }}>
          ★★★★★
        </span>
      </span>
      <span className="rating-value">
        {normalizedRating.toFixed(1)} ({Number(ratingCount || 0).toLocaleString("en-US")})
      </span>
    </>
  );
}

function ParkingBadge({ cafe }) {
  const parking = parkingDifficulty(cafe);
  return (
    <span
      className={`parking-badge is-${parking.tone}`}
      title="按门店所在街区估算；实际车位与限制请以现场为准"
      aria-label={`停车难度：${parking.label}，三级中的 ${parking.dots} 级`}
    >
      <Icon name="car-front" />
      <span>停车 {parking.label}</span>
      <span className="parking-dots" aria-hidden="true">
        {[1, 2, 3].map(dot => <i className={dot <= parking.dots ? "is-filled" : ""} key={dot} />)}
      </span>
    </span>
  );
}

function markerIcon(cafe, isActive) {
  return L.divIcon({
    className: "",
    html: `<div class="coffee-marker${isActive ? " is-active" : ""}"><span>${cafe.number}</span></div>`,
    iconSize: [34, 42],
    iconAnchor: [17, 39],
    popupAnchor: [0, -38]
  });
}

function nearbyMarkerIcon(category) {
  const label = nearbyConfigFor({ category }).marker;
  return L.divIcon({
    className: "",
    html: `<div class="nearby-marker is-${category}"><span>${label}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

function cafeAtlasStyle(cafe, photoIndex) {
  const item = imageAtlas.items[cafe.id];
  if (!item) return null;
  const atlasFile = imageAtlas.files?.[photoIndex]?.[item.page || 0];
  if (!atlasFile) return null;

  const xRange = imageAtlas.width - imageAtlas.cellWidth;
  const yRange = imageAtlas.height - imageAtlas.cellHeight;
  const x = xRange ? (item.x / xRange) * 100 : 0;
  const y = yRange ? (item.y / yRange) * 100 : 0;

  return {
    backgroundImage: `url("${import.meta.env.BASE_URL}${atlasFile}")`,
    backgroundSize: `${(imageAtlas.width / imageAtlas.cellWidth) * 100}% ${(imageAtlas.height / imageAtlas.cellHeight) * 100}%`,
    backgroundPosition: `${x}% ${y}%`
  };
}

function requestLightbox(cafeId, photoIndex) {
  window.dispatchEvent(new CustomEvent("coffee-lightbox-open", {
    detail: { cafeId, photoIndex }
  }));
}

function CafePhoto({ cafe, eager = false }) {
  const photos = photoData[cafe.id] || [{
    file: cafe.image?.replace(/^\//, ""),
    credit: cafe.imageCredit,
    source: cafe.imageSource || cafe.website
  }];
  const [activeIndex, setActiveIndex] = useState(0);
  if (!photos.length || !photos[0]?.file) return null;

  const showPhoto = nextIndex => {
    setActiveIndex((nextIndex + photos.length) % photos.length);
  };

  return (
    <div className="cafe-photo" data-photo-index={activeIndex} data-photo-count={photos.length}>
      <div className="cafe-photo-track" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {photos.map((photo, photoIndex) => {
          const atlasStyle = cafeAtlasStyle(cafe, photoIndex);
          return (
            <div className="cafe-photo-slide" key={`${cafe.id}-${photoIndex}`}>
              {atlasStyle ? (
                <div
                  className="cafe-photo-frame"
                  role="img"
                  aria-label={`${cafe.name} 实景照片 ${photoIndex + 1}`}
                  style={atlasStyle}
                />
              ) : (
                <img
                  src={`${import.meta.env.BASE_URL}${photo.file}`}
                  alt={`${cafe.name} 实景照片 ${photoIndex + 1}`}
                  loading={eager && photoIndex === 0 ? "eager" : "lazy"}
                  decoding={eager && photoIndex === 0 ? "sync" : "async"}
                />
              )}
              <button
                className="photo-open-button"
                type="button"
                aria-label={`放大查看 ${cafe.name} 第 ${photoIndex + 1} 张照片`}
                data-cafe-id={cafe.id}
                data-photo-index={photoIndex}
                onClick={event => {
                  event.stopPropagation();
                  requestLightbox(cafe.id, photoIndex);
                }}
              />
              {photo.credit ? (
                <a
                  className="photo-credit"
                  href={photo.source || cafe.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`配图来源：${photo.credit}`}
                >
                  配图来源：{photo.credit}
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
      {photos.length > 1 ? (
        <>
          <button
            className="photo-nav is-previous"
            type="button"
            aria-label={`查看 ${cafe.name} 上一张照片`}
            data-photo-direction="-1"
            onClick={event => {
              event.stopPropagation();
              showPhoto(activeIndex - 1);
            }}
          >
            <Icon name="chevron-left" />
          </button>
          <button
            className="photo-nav is-next"
            type="button"
            aria-label={`查看 ${cafe.name} 下一张照片`}
            data-photo-direction="1"
            onClick={event => {
              event.stopPropagation();
              showPhoto(activeIndex + 1);
            }}
          >
            <Icon name="chevron-right" />
          </button>
          <span className="photo-counter" aria-live="polite">{activeIndex + 1} / {photos.length}</span>
        </>
      ) : null}
    </div>
  );
}

function PhotoLightbox({ cafe, initialIndex, onClose }) {
  const photos = photoData[cafe.id] || [];
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const touchStartRef = useRef(null);
  const photo = photos[activeIndex];

  useEffect(() => {
    setActiveIndex(initialIndex);
  }, [cafe.id, initialIndex]);

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setActiveIndex(index => (index - 1 + photos.length) % photos.length);
      if (event.key === "ArrowRight") setActiveIndex(index => (index + 1) % photos.length);
    };
    document.body.classList.add("is-lightbox-open");
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("is-lightbox-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, photos.length]);

  if (!photo) return null;
  const showPhoto = nextIndex => setActiveIndex((nextIndex + photos.length) % photos.length);

  return (
    <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`${cafe.name} 图片轮播`} onClick={onClose}>
      <div className="lightbox-dialog" onClick={event => event.stopPropagation()}>
        <div className="lightbox-heading">
          <div>
            <strong>{cafe.name}</strong>
            <span>{activeIndex + 1} / {photos.length}</span>
          </div>
          <button className="lightbox-close" type="button" aria-label="关闭大图" onClick={onClose} autoFocus>
            <Icon name="x" />
          </button>
        </div>
        <div
          className="lightbox-stage"
          onTouchStart={event => {
            touchStartRef.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={event => {
            if (touchStartRef.current == null) return;
            const delta = (event.changedTouches[0]?.clientX ?? touchStartRef.current) - touchStartRef.current;
            touchStartRef.current = null;
            if (Math.abs(delta) < 42) return;
            showPhoto(activeIndex + (delta < 0 ? 1 : -1));
          }}
        >
          <div
            className="lightbox-image"
            role="img"
            aria-label={`${cafe.name} 实景照片 ${activeIndex + 1}`}
            style={cafeAtlasStyle(cafe, activeIndex)}
          />
          {photos.length > 1 ? (
            <>
              <button className="lightbox-nav is-previous" type="button" aria-label="上一张" onClick={() => showPhoto(activeIndex - 1)}>
                <Icon name="chevron-left" />
              </button>
              <button className="lightbox-nav is-next" type="button" aria-label="下一张" onClick={() => showPhoto(activeIndex + 1)}>
                <Icon name="chevron-right" />
              </button>
            </>
          ) : null}
        </div>
        <a className="lightbox-credit" href={photo.source || cafe.website} target="_blank" rel="noopener noreferrer">
          配图来源：{photo.credit || "来源页"}
          <Icon name="external-link" />
        </a>
      </div>
    </div>
  );
}

function DetailPanelContent({ cafe, userLatLng, eagerPhoto = true }) {
  const tags = cafe.tags.map(tag => (
    <span className="pill" key={tag}>
      {tagLabels[tag] || tag}
    </span>
  ));
  const distance = userLatLng ? (
    <span className="pill is-blue">{distanceInMiles(userLatLng, cafe).toFixed(1)} mi</span>
  ) : null;

  return (
    <>
      <CafePhoto cafe={cafe} eager={eagerPhoto} />
      <div className="card-meta">
        <span className="pill is-coral">{cafe.number}</span>
        <span className="pill">{regionLabels[cafe.region]}</span>
        <ParkingBadge cafe={cafe} />
        {distance}
      </div>
      <h2>{cafe.name}</h2>
      <p className="detail-address">{cafe.address}</p>
      <p className="detail-signature">
        <strong>{cafe.signature}</strong>
      </p>
      {cafe.rating ? (
        <p className="card-rating">
          <StarRating rating={cafe.rating} ratingCount={cafe.ratingCount} />
          <a className="rating-count" href={cafe.ratingSource} target="_blank" rel="noopener noreferrer">
            Google Maps
          </a>
        </p>
      ) : null}
      <p className="detail-vibe">{cafeIntro(cafe)}</p>
      <OpeningHours cafe={cafe} />
      <NearbyPlaces cafe={cafe} />
      <div className="card-meta detail-tags">{tags}</div>
      <div className="detail-actions">
        <a className="card-button primary" href={directionsUrl(cafe)} target="_blank" rel="noopener noreferrer">
          <Icon name="navigation" />
          <span>导航</span>
        </a>
        <a className="card-button" href={cafe.website} target="_blank" rel="noopener noreferrer">
          <Icon name="external-link" />
          <span>官网</span>
        </a>
      </div>
    </>
  );
}

function popupHtml(cafe, userLatLng) {
  return renderToStaticMarkup(
    <article className="detail-panel popup-detail-panel" aria-label={`${cafe.name} 详情`}>
      <DetailPanelContent cafe={cafe} userLatLng={userLatLng} eagerPhoto={false} />
    </article>
  );
}

function nearbyPopupHtml(place) {
  const config = nearbyConfigFor(place);
  return renderToStaticMarkup(
    <article className="nearby-popup">
      <strong>{place.name}</strong>
      {place.address ? <span>{place.address}</span> : null}
      <small>{config.shortLabel} · {formatNearbyDistance(place.distanceMeters)}</small>
      <a href={nearbyMapsUrl(place)} target="_blank" rel="noopener noreferrer">Google Maps</a>
    </article>
  );
}

function fitCafesOnMap(map, cafeList) {
  if (!map) return;

  if (!cafeList.length) {
    fitCafesOnMap(map, numberedCafes);
    return;
  }

  if (cafeList.length === 1) {
    map.flyTo(cafeList[0].coords, 14, { duration: 0.6 });
    return;
  }

  const bounds = L.latLngBounds(cafeList.map(cafe => cafe.coords));
  map.fitBounds(bounds.pad(0.18), {
    maxZoom: 12,
    animate: true,
    duration: 0.6
  });
}

function fitCafeContext(map, cafe) {
  if (!map || !cafe) return;
  map.stop();
  const nearbyCoords = allNearbyPlaces(cafe).map(place => place.coords);
  if (nearbyCoords.length) {
    map.fitBounds(L.latLngBounds([cafe.coords, ...nearbyCoords]).pad(0.22), {
      animate: false,
      maxZoom: 14,
      padding: [28, 28]
    });
  } else {
    map.setView(cafe.coords, Math.max(map.getZoom(), 14), { animate: false });
  }
}

export default function App() {
  const [regions, setRegions] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [selectedParking, setSelectedParking] = useState([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [userLatLng, setUserLatLng] = useState(null);
  const [locating, setLocating] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [fitNonce, setFitNonce] = useState(1);
  const [mapReady, setMapReady] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const mapAreaRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);
  const nearbyLayerRef = useRef(null);
  const markersRef = useRef(new Map());
  const popupRequestRef = useRef(0);
  const userMarkerRef = useRef(null);
  const filteredCafesRef = useRef([]);

  const cafeById = useMemo(() => new Map(numberedCafes.map(cafe => [cafe.id, cafe])), []);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    const handleLightboxRequest = event => {
      const { cafeId, photoIndex } = event.detail || {};
      if (!cafeById.has(cafeId)) return;
      setLightbox({ cafeId, photoIndex: Number(photoIndex) || 0 });
    };
    window.addEventListener("coffee-lightbox-open", handleLightboxRequest);
    return () => window.removeEventListener("coffee-lightbox-open", handleLightboxRequest);
  }, [cafeById]);

  const filteredCafes = useMemo(() => {
    const queryText = query.trim().toLowerCase();

    const filtered = numberedCafes.filter(cafe => {
      if (regions.length && !regions.includes(cafe.region)) return false;
      for (const group of preferenceGroups) {
        const selectedOptions = group.options.filter(option => selectedPreferences.includes(option.id));
        if (selectedOptions.length && !selectedOptions.some(option => option.tags.some(tag => cafe.tags.includes(tag)))) {
          return false;
        }
      }
      if (selectedParking.length && !selectedParking.includes(parkingDifficulty(cafe).tone)) return false;
      if (queryText && !cafeSearchText(cafe).includes(queryText)) return false;
      return true;
    });

    if (!userLatLng) return filtered;

    return [...filtered].sort((a, b) => distanceInMiles(userLatLng, a) - distanceInMiles(userLatLng, b));
  }, [query, regions, selectedParking, selectedPreferences, userLatLng]);

  const selectedCafe = selectedId ? cafeById.get(selectedId) : null;

  const mapStatus = selectedCafe
    ? {
        icon: "map-pin",
        text: `${selectedCafe.neighborhood} · 附近 ${allNearbyPlaces(selectedCafe).length} 个地点`
      }
    : { icon: "map-pin", text: "湾区视图" };

  useEffect(() => {
    filteredCafesRef.current = filteredCafes;
  }, [filteredCafes]);

  const showToast = useCallback(message => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(current => [...current, { id, message }]);
    window.setTimeout(() => {
      setToasts(current => current.filter(toast => toast.id !== id));
    }, 2800);
  }, []);

  const requestFit = useCallback(() => {
    setFitNonce(value => value + 1);
  }, []);

  const fitBayArea = useCallback(() => {
    setRegions([]);
    setSelectedPreferences([]);
    setSelectedParking([]);
    setQuery("");
    setSelectedId(null);
    requestFit();
  }, [requestFit]);

  const selectCafe = useCallback(
    (id, { pan = true, openPopup = false } = {}) => {
      const cafe = cafeById.get(id);
      if (!cafe) return;

      setSelectedId(id);

      const map = mapRef.current;

      if (openPopup) {
        const requestId = popupRequestRef.current + 1;
        popupRequestRef.current = requestId;
        const openSelectedPopup = () => {
          if (popupRequestRef.current !== requestId) return;
          markersRef.current.get(id)?.openPopup();
        };

        window.setTimeout(openSelectedPopup, map && pan ? 120 : 0);
      }

      if (map && pan) {
        fitCafeContext(map, cafe);
      }
    },
    [cafeById]
  );

  useEffect(() => {
    const mapNode = mapContainerRef.current;
    if (!mapNode) return undefined;

    const map = L.map(mapNode, {
      zoomControl: false,
      scrollWheelZoom: true,
      worldCopyJump: true
    }).setView([37.66, -122.2], 9);

    mapRef.current = map;
    markerLayerRef.current = L.layerGroup().addTo(map);
    nearbyLayerRef.current = L.layerGroup().addTo(map);

    L.tileLayer(mapTileConfig.url, mapTileConfig.options).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const handlePopupPhotoNav = event => {
      const openButton = event.target.closest(".leaflet-popup .photo-open-button");
      if (openButton) {
        event.preventDefault();
        event.stopPropagation();
        requestLightbox(openButton.dataset.cafeId, Number(openButton.dataset.photoIndex));
        return;
      }

      const button = event.target.closest(".leaflet-popup .photo-nav");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();

      const photo = button.closest(".cafe-photo");
      const count = Number(photo?.dataset.photoCount || 1);
      const current = Number(photo?.dataset.photoIndex || 0);
      const direction = Number(button.dataset.photoDirection || 0);
      const next = (current + direction + count) % count;
      photo.dataset.photoIndex = String(next);
      const track = photo.querySelector(".cafe-photo-track");
      if (track) track.style.transform = `translateX(-${next * 100}%)`;
      const counter = photo.querySelector(".photo-counter");
      if (counter) counter.textContent = `${next + 1} / ${count}`;
    };
    mapNode.addEventListener("click", handlePopupPhotoNav);

    map.on("locationfound", event => {
      setUserLatLng(event.latlng);
      setLocating(false);

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(event.latlng);
      } else {
        userMarkerRef.current = L.circleMarker(event.latlng, {
          radius: 8,
          color: "#2f6fbb",
          fillColor: "#2f6fbb",
          fillOpacity: 0.85,
          weight: 3
        }).addTo(map);
      }

      showToast("已按距离重新排列当前列表。");
      map.flyTo(event.latlng, 11, { duration: 0.7 });
    });

    map.on("locationerror", () => {
      setLocating(false);
      showToast("定位不可用。");
    });

    setMapReady(true);

    return () => {
      setMapReady(false);
      markersRef.current.clear();
      userMarkerRef.current = null;
      markerLayerRef.current = null;
      nearbyLayerRef.current = null;
      mapRef.current = null;
      mapNode.removeEventListener("click", handlePopupPhotoNav);
      map.remove();
    };
  }, [showToast]);

  useEffect(() => {
    if (!selectedId) return;
    if (!filteredCafes.some(cafe => cafe.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filteredCafes, selectedId]);

  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!mapReady || !layer) return;

    layer.clearLayers();
    markersRef.current.clear();

    filteredCafes.forEach(cafe => {
      const marker = L.marker(cafe.coords, {
        icon: markerIcon(cafe, false),
        title: cafe.name
      }).bindPopup(popupHtml(cafe, userLatLng), {
        autoPan: false,
        autoPanPaddingTopLeft: L.point(22, 96),
        autoPanPaddingBottomRight: L.point(22, 22),
        keepInView: false,
        maxWidth: 300
      });

      marker.on("click", () => selectCafe(cafe.id, { pan: true, openPopup: true }));
      markersRef.current.set(cafe.id, marker);
      layer.addLayer(marker);
    });
  }, [filteredCafes, mapReady, selectCafe, userLatLng]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const cafe = cafeById.get(id);
      if (cafe) marker.setIcon(markerIcon(cafe, id === selectedId));
    });
  }, [cafeById, selectedId]);

  useEffect(() => {
    const layer = nearbyLayerRef.current;
    if (!mapReady || !layer) return;
    layer.clearLayers();
    if (!selectedCafe) return;

    const nearby = allNearbyPlaces(selectedCafe);
    if (!nearby.length) return;

    L.circle(selectedCafe.coords, {
      radius: selectedCafe.nearbyPlaces?.radiusMeters ?? 1200,
      color: "#c56f3d",
      fillColor: "#e6b88b",
      fillOpacity: 0.08,
      opacity: 0.55,
      weight: 1.5,
      dashArray: "5 7",
      interactive: false
    }).addTo(layer);

    nearby.forEach(place => {
      L.marker(place.coords, {
        icon: nearbyMarkerIcon(place.category),
        title: `${place.name} · ${formatNearbyDistance(place.distanceMeters)}`,
        zIndexOffset: 700
      })
        .bindTooltip(`${place.name} · ${formatNearbyDistance(place.distanceMeters)}`, {
          direction: "top",
          offset: L.point(0, -10)
        })
        .bindPopup(nearbyPopupHtml(place), { maxWidth: 240 })
        .addTo(layer);
    });
    const focusTimer = window.setTimeout(() => fitCafeContext(mapRef.current, selectedCafe), 80);
    return () => window.clearTimeout(focusTimer);
  }, [mapReady, selectedCafe]);

  useEffect(() => {
    if (!mapReady || selectedId) return;
    fitCafesOnMap(mapRef.current, filteredCafesRef.current);
  }, [fitNonce, mapReady, selectedId]);

  useEffect(() => {
    const syncFullscreen = () => {
      const isFullscreen =
        document.fullscreenElement === mapAreaRef.current ||
        document.body.classList.contains("is-map-fullscreen");
      setMapFullscreen(isFullscreen);
      window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      showToast("当前浏览器不支持定位。");
      return;
    }

    setLocating(true);
    mapRef.current?.locate({ enableHighAccuracy: false, timeout: 9000, maximumAge: 60000 });
  }, [showToast]);

  const toggleMapFullscreen = useCallback(() => {
    const mapArea = mapAreaRef.current;
    if (!mapArea) return;

    const isNativeFullscreen = document.fullscreenElement === mapArea;
    const isFallbackFullscreen = document.body.classList.contains("is-map-fullscreen");

    if (isNativeFullscreen || isFallbackFullscreen) {
      document.body.classList.remove("is-map-fullscreen");

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setMapFullscreen(false);
          window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
        });
      } else {
        setMapFullscreen(false);
        window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
      }
      return;
    }

    if (mapArea.requestFullscreen) {
      mapArea.requestFullscreen().catch(() => {
        document.body.classList.add("is-map-fullscreen");
        setMapFullscreen(true);
        window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
      });
    } else {
      document.body.classList.add("is-map-fullscreen");
      setMapFullscreen(true);
      window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
    }
  }, []);

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <button className="brand" type="button" aria-label="回到湾区全图" onClick={fitBayArea}>
            <span className="brand-mark">
              <Icon name="coffee" />
            </span>
            <span>
              <strong>湾区咖啡地图</strong>
              <small>Bay Area Coffee Map</small>
            </span>
          </button>

          <label className="search-box" htmlFor="searchInput">
            <Icon name="search" />
            <input
              id="searchInput"
              type="search"
              placeholder="搜索店名、城市、标签"
              autoComplete="off"
              value={query}
              onChange={event => setQuery(event.target.value)}
            />
          </label>

          <div className="top-actions">
            <button className="icon-button" type="button" aria-label="湾区全图" title="湾区全图" onClick={fitBayArea}>
              <Icon name="maximize-2" />
            </button>
            <button className="action-button" type="button" disabled={locating} onClick={handleLocate}>
              <Icon name="locate-fixed" />
              <span>定位</span>
            </button>
          </div>
        </header>

        <main className="workspace">
          <aside className="sidebar" aria-label="咖啡店筛选和列表">
            <section className="panel summary-panel">
              <div>
                <p className="eyebrow">精选清单</p>
                <h1>从海边到南湾，按当天节奏找一杯好咖啡。</h1>
              </div>
              <div className="metric-grid">
                <div>
                  <strong>{numberedCafes.length}</strong>
                  <span>咖啡店</span>
                </div>
                <div>
                  <strong>{regionOptions.length - 1}</strong>
                  <span>区域</span>
                </div>
                <div>
                  <strong>{filteredCafes.length}</strong>
                  <span>当前结果</span>
                </div>
              </div>
            </section>

            <section className="panel filter-panel">
              <div className="control-block">
                <div className="control-heading">
                  <span>区域</span>
                  <Icon name="map" />
                </div>
                <div className="segmented" role="list">
                  {regionOptions.map(option => (
                    <button
                      className={`segment-button${option.id === "all" ? (regions.length === 0 ? " is-active" : "") : (regions.includes(option.id) ? " is-active" : "")}`}
                      type="button"
                      key={option.id}
                      aria-pressed={option.id === "all" ? regions.length === 0 : regions.includes(option.id)}
                      onClick={() => {
                        if (option.id === "all") setRegions([]);
                        else toggleArrayValue(setRegions, option.id);
                        requestFit();
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-block">
                <div className="control-heading">
                  <span>偏好 <small>可多选 · 组内任一</small></span>
                  <Icon name="sliders-horizontal" />
                </div>
                {preferenceGroups.map(group => (
                  <div className="filter-subgroup" key={group.id}>
                    <div className="filter-subheading">{group.label}</div>
                    <div className="chips" role="group" aria-label={group.label}>
                      {group.options.map(option => (
                        <button
                          className={`chip${selectedPreferences.includes(option.id) ? " is-active" : ""}`}
                          type="button"
                          key={option.id}
                          aria-pressed={selectedPreferences.includes(option.id)}
                          onClick={() => {
                            toggleArrayValue(setSelectedPreferences, option.id);
                            requestFit();
                          }}
                        >
                          <Icon name={option.icon} />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="control-block">
                <div className="control-heading">
                  <span>停车 <small>可多选</small></span>
                  <Icon name="car-front" />
                </div>
                <div className="chips" role="group" aria-label="停车难度">
                  {parkingOptions.map(option => (
                    <button
                      className={`chip${selectedParking.includes(option.id) ? " is-active" : ""}`}
                      type="button"
                      key={option.id}
                      aria-pressed={selectedParking.includes(option.id)}
                      onClick={() => {
                        toggleArrayValue(setSelectedParking, option.id);
                        requestFit();
                      }}
                    >
                      <Icon name={option.icon} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="list-section">
              <div className="list-head">
                <h2>咖啡店</h2>
                <span>{filteredCafes.length} 家</span>
              </div>
              <div className="cafe-list">
                {filteredCafes.length ? (
                  filteredCafes.map((cafe, index) => {
                    const distance = userLatLng ? (
                      <span className="pill is-blue">{distanceInMiles(userLatLng, cafe).toFixed(1)} mi</span>
                    ) : null;
                    const tags = cafe.tags.slice(0, 3).map(item => (
                      <span className="pill" key={item}>
                        {tagLabels[item] || item}
                      </span>
                    ));

                    return (
                      <article
                        className={`cafe-card${cafe.id === selectedId ? " is-active" : ""}`}
                        key={cafe.id}
                        tabIndex={0}
                        onClick={event => {
                          if (event.target.closest("a, button")) return;
                          selectCafe(cafe.id, { pan: true, openPopup: true });
                        }}
                        onKeyDown={event => {
                          if (!["Enter", " "].includes(event.key)) return;
                          event.preventDefault();
                          selectCafe(cafe.id, { pan: true, openPopup: true });
                        }}
                      >
                        <CafePhoto cafe={cafe} eager={index === 0} />
                        <div className="card-meta">
                          <span className="pill is-coral">{cafe.number}</span>
                          <span className="pill">{regionLabels[cafe.region]}</span>
                          <ParkingBadge cafe={cafe} />
                          {distance}
                        </div>
                        <div>
                          <h3>{cafe.name}</h3>
                          <p>
                            {cafe.neighborhood} · {cafe.city}
                          </p>
                        </div>
                        {cafe.rating ? (
                          <p className="card-rating">
                            <StarRating rating={cafe.rating} ratingCount={cafe.ratingCount} />
                            <a className="rating-count" href={cafe.ratingSource} target="_blank" rel="noopener noreferrer">
                              Google Maps
                            </a>
                          </p>
                        ) : null}
                        <p className="card-vibe">{cafeIntro(cafe)}</p>
                        <div className="card-meta">{tags}</div>
                        <div className="card-actions">
                          <a
                            className="card-button primary"
                            href={directionsUrl(cafe)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${cafe.name} 导航`}
                          >
                            <Icon name="navigation" />
                            <span>导航</span>
                          </a>
                          <a
                            className="card-button"
                            href={cafe.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${cafe.name} 官网`}
                          >
                            <Icon name="external-link" />
                            <span>官网</span>
                          </a>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="empty-state">没有匹配的咖啡店</div>
                )}
              </div>
            </section>
          </aside>

          <section className="map-area" aria-label="湾区咖啡地图" ref={mapAreaRef}>
            <div id="map" ref={mapContainerRef} />
            <div className="map-status">
              <Icon name={mapStatus.icon} />
              <span>{mapStatus.text}</span>
            </div>
            <button
              className="icon-button map-fit-button"
              type="button"
              aria-label={mapFullscreen ? "退出地图全屏" : "地图全屏"}
              title={mapFullscreen ? "退出地图全屏" : "地图全屏"}
              onClick={toggleMapFullscreen}
            >
              <Icon name={mapFullscreen ? "minimize-2" : "maximize-2"} />
            </button>
          </section>
        </main>

        <footer className="footer">
          <span>资料整理：{dataUpdatedAt}</span>
          <span>出行前请以各店官网营业时间为准。</span>
          <span>{mapAttributionText}</span>
        </footer>
      </div>

      {lightbox ? (
        <PhotoLightbox
          cafe={cafeById.get(lightbox.cafeId)}
          initialIndex={lightbox.photoIndex}
          onClose={closeLightbox}
        />
      ) : null}

      <div className="toast-stack" aria-live="polite">
        {toasts.map(toast => (
          <div className="toast" key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
