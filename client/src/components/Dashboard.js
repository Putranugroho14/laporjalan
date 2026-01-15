import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { Map, MapPin, Calendar, User, AlertCircle, CheckCircle, Clock, Navigation } from 'lucide-react';
import { colors, glass, borderRadius, shadows, transitions } from '../designSystem';
import config from "../config";
import { useAlert } from './AlertContext';

// Custom Marker Icons
const createIcon = (color) => {
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const icons = {
  Darurat: createIcon('red'),
  Tinggi: createIcon('orange'),
  Sedang: createIcon('blue'),
  Rendah: createIcon('green'),
  Berat: createIcon('red'),
  Ringan: createIcon('green'),
  Default: createIcon('blue')
};

// Component to handle map center changes
function MapController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom, {
        animate: true,
        duration: 1
      });
    }
  }, [center, zoom, map]);

  return null;
}

function Dashboard() {
  const [reports, setReports] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [mapCenter, setMapCenter] = useState([-7.7956, 110.3695]);
  const [mapZoom, setMapZoom] = useState(13);
  const [selectedImage, setSelectedImage] = useState(null);
  const { showAlert } = useAlert();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter States
  const [filterCategory, setFilterCategory] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest
  const [showOnlyMyReports, setShowOnlyMyReports] = useState(false);
  const currentUserName = localStorage.getItem('nama');

  const DAMAGE_TYPES = [
    "Jalan berlubang", "Retak memanjang", "Retak melebar", "Aspal terkelupas",
    "Jalan amblas", "Jalan bergelombang", "Tergenang air", "Longsor kecil",
    "Marka jalan rusak", "Bahu jalan rusak"
  ];

  useEffect(() => {
    const fetchReports = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get(`${config.apiUrl}/api/reports`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReports(res.data.data);
      } catch (err) {
        showAlert("Gagal memuat peta sebaran. Silakan coba beberapa saat lagi.", "error");
      }
    };
    fetchReports();
  }, []);

  // Filter & Sort Logic
  const filteredReports = reports
    .filter(report => {
      // Filter by Category
      if (filterCategory && (report.damageType || report.title) !== filterCategory) return false;

      // Filter by User's Own Reports
      if (showOnlyMyReports && report.pelapor?.nama !== currentUserName) return false;

      return true;
    })
    .sort((a, b) => {
      // Sort by Date
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  // Calculate Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, sortBy]);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Pagination Styles
  const paginationButtonStyle = (isActive) => ({
    padding: '8px 16px',
    borderRadius: borderRadius.lg,
    border: `1px solid ${isActive ? colors.primary : 'rgba(255,255,255,0.1)'}`,
    background: isActive ? colors.primary : 'rgba(255,255,255,0.05)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: transitions.fast,
    fontWeight: isActive ? '600' : 'normal',
    outline: 'none',
  });

  const handleCardClick = (report) => {
    setSelectedReport(report.id);
    setMapCenter([Number(report.latitude), Number(report.longitude)]);
    setMapZoom(17);

    // Scroll to map
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    // Clear selection after animation
    setTimeout(() => setSelectedReport(null), 3000);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return colors.warning;
      case 'proses': return colors.info;
      case 'selesai': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return <Clock size={16} />;
      case 'proses': return <AlertCircle size={16} />;
      case 'selesai': return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const parseImpactedVehicles = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return [data];
    }
  };

  // Styles
  const darkGlassCard = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.xl,
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  };

  const containerStyle = {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: isMobile ? '10px' : '20px',
    color: '#fff',
    paddingTop: isMobile ? '80px' : '20px', // Space for fixed navbar
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: isMobile ? '20px' : '40px',
  };

  const titleStyle = {
    fontSize: isMobile ? '32px' : '56px',
    fontWeight: '900',
    background: 'linear-gradient(135deg, #fff 0%, #3b82f6 50%, #2563eb 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '16px',
    letterSpacing: isMobile ? '-1px' : '-2px',
    filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.3))',
  };

  const subtitleStyle = {
    fontSize: '18px',
    color: 'rgba(255, 255, 255, 0.6)',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
    letterSpacing: '0.5px',
  };

  const mapSectionStyle = {
    ...darkGlassCard,
    padding: isMobile ? '12px' : '24px',
    marginBottom: isMobile ? '20px' : '40px',
  };

  const mapTitleStyle = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const mapContainerWrapperStyle = {
    height: isMobile ? '350px' : '500px',
    width: '100%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    boxShadow: shadows.lg,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const cardsGridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: isMobile ? '16px' : '24px',
  };

  const cardStyle = (reportId) => ({
    ...darkGlassCard,
    padding: 0,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: transitions.normal,
    transform: hoveredCard === reportId || selectedReport === reportId ? 'translateY(-8px)' : 'translateY(0)',
    boxShadow: hoveredCard === reportId || selectedReport === reportId ? '0 15px 30px rgba(0,0,0,0.5)' : '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
    border: selectedReport === reportId ? `1px solid ${colors.primary}` : '1px solid rgba(255, 255, 255, 0.1)',
  });

  const cardImageContainerStyle = {
    position: 'relative',
    height: '160px', // Resized from 220px to 160px
    overflow: 'hidden',
  };

  const cardImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: transitions.normal,
  };

  const cardOverlayStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
    padding: '20px',
    color: colors.white,
  };

  const cardTitleStyle = {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '4px',
    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  };

  const cardLocationStyle = {
    fontSize: '13px',
    opacity: 0.9,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const cardContentStyle = {
    padding: '20px',
  };

  const cardDescriptionStyle = {
    fontSize: '14px',
    color: '#ccc', // Lighter text for dark mode
    lineHeight: '1.6',
    marginBottom: '16px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  const cardMetaStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  };

  const cardMetaItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#aaa',
  };

  const statusBadgeStyle = (status) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderRadius: borderRadius.pill,
    fontSize: '13px',
    fontWeight: '600',
    background: `${getStatusColor(status)}20`,
    color: getStatusColor(status),
    border: `1px solid ${getStatusColor(status)}40`,
  });

  const emptyStateStyle = {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#aaa',
  };

  const clickHintStyle = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: 'rgba(37, 99, 235, 0.9)',
    color: colors.white,
    padding: '6px 12px',
    borderRadius: borderRadius.pill,
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    opacity: hoveredCard ? 1 : 0,
    transition: transitions.fast,
  };

  const selectStyle = {
    padding: '12px 20px',
    borderRadius: borderRadius.lg,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    background: 'rgba(0, 0, 0, 0.4)',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    outline: 'none',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    minWidth: '200px',
    appearance: 'none',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.9)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    cursor: 'pointer',
  };

  return (
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .cards-grid {
              grid-template-columns: 1fr !important;
            }
          }
          /* Dark Options for Select */
          select option {
            background-color: #1a1a1a !important;
            color: #fff !important;
          }
        `}
      </style>

      {/* Image Modal */}
      {selectedImage && (
        <div style={modalOverlayStyle} onClick={() => setSelectedImage(null)}>
          <img
            src={selectedImage}
            alt="Full Size"
            style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 0 50px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#fff',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>
        </div>
      )}

      <div style={containerStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div style={{
              padding: '16px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '24px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
            }}>
              <Map size={40} color="#3b82f6" />
            </div>
          </div>
          <h1 style={titleStyle}>Peta Sebaran Laporan</h1>
          <div style={{
            width: '80px',
            height: '4px',
            background: 'linear-gradient(to right, transparent, #3b82f6, transparent)',
            margin: '20px auto',
            borderRadius: '2px',
          }} />
          <p style={subtitleStyle}>Klik kartu laporan untuk melihat lokasinya di peta dan memantau kondisi infrastruktur jalan raya</p>
        </div>

        {/* Map Section */}
        <div style={mapSectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ ...mapTitleStyle, marginBottom: 0 }}>
              <MapPin size={28} color={colors.primary} />
              Peta Interaktif
            </h2>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={selectStyle}
              >
                <option value="">Semua Kategori</option>
                {DAMAGE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              {/* My Reports Filter Toggle */}
              <button
                onClick={() => setShowOnlyMyReports(!showOnlyMyReports)}
                style={{
                  ...selectStyle,
                  background: showOnlyMyReports ? colors.primary : 'rgba(255,255,255,0.05)',
                  color: showOnlyMyReports ? '#fff' : 'rgba(255,255,255,0.7)',
                  border: `1px solid ${showOnlyMyReports ? colors.primary : 'rgba(255,255,255,0.1)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <User size={16} />
                <span>{showOnlyMyReports ? 'Semua Laporan' : 'Laporan Saya'}</span>
              </button>
            </div>
          </div>

          {/* Map Color Legend */}
          <div style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '20px',
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: borderRadius.lg,
            border: '1px solid rgba(255,255,255,0.05)',
            width: 'fit-content',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '12px', color: '#aaa', marginRight: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Tingkat Prioritas:</div>
            {[
              { label: 'Darurat', color: '#ef4444' }, // Red
              { label: 'Tinggi', color: '#f97316' },  // Orange
              { label: 'Sedang', color: '#3b82f6' },  // Blue
              { label: 'Rendah', color: '#10b981' }   // Green
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, boxShadow: `0 0 10px ${item.color}80` }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={mapContainerWrapperStyle}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapController center={mapCenter} zoom={mapZoom} />
              {filteredReports.map((lap) => (
                <Marker
                  key={lap.id}
                  position={[Number(lap.latitude), Number(lap.longitude)]}
                  icon={icons[lap.priority] || icons[lap.damageSeverity] || icons.Default}
                >
                  <Popup>
                    <div style={{ minWidth: '200px', textAlign: 'left', color: '#000' }}> {/* Keep popup black text for contrast on white bg, or style popup dark */}
                      <img
                        src={lap.photo.startsWith('http') ? lap.photo : `${config.uploads}/${lap.photo}`}
                        alt="Bukti"
                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
                      />
                      <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>
                        {lap.damageType || lap.title}
                      </div>

                      {/* Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px', fontSize: '11px', marginBottom: '8px', color: '#666' }}>
                        <div style={{ fontWeight: '600' }}>Tingkat:</div>
                        <div>{lap.damageSeverity || '-'}</div>

                        <div style={{ fontWeight: '600' }}>Dampak:</div>
                        <div>{lap.trafficImpact || '-'}</div>

                        <div style={{ fontWeight: '600' }}>Kendaraan:</div>
                        <div>
                          {parseImpactedVehicles(lap.impactedVehicles).join(', ') || '-'}
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', marginBottom: '8px', borderTop: '1px solid #eee', paddingTop: '4px' }}>
                        {lap.description}
                      </div>

                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: `${getStatusColor(lap.status)}20`,
                        color: getStatusColor(lap.status),
                      }}>
                        {lap.status}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Cards Grid */}
        <div style={cardsGridStyle} className="cards-grid">
          {currentItems.length === 0 ? (
            <div style={emptyStateStyle}>
              <MapPin size={64} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p style={{ fontSize: '18px', fontWeight: '600' }}>
                {filterCategory ? 'Tidak ada laporan untuk kategori ini' : 'Belum ada laporan'}
              </p>
              <p>Mulai laporkan kerusakan jalan di sekitar Anda</p>
            </div>
          ) : (
            currentItems.map(lap => (
              <div
                key={lap.id}
                style={cardStyle(lap.id)}
                onMouseEnter={() => setHoveredCard(lap.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleCardClick(lap)}
              >
                <div style={cardImageContainerStyle}>
                  <img
                    src={lap.photo.startsWith('http') ? lap.photo : `${config.uploads}/${lap.photo}`}
                    alt={lap.title}
                    style={cardImageStyle}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(lap.photo.startsWith('http') ? lap.photo : `${config.uploads}/${lap.photo}`);
                    }}
                  />
                  <div style={clickHintStyle}>
                    <Navigation size={14} />
                    <span>Lihat di Peta</span>
                  </div>
                  <div style={cardOverlayStyle}>
                    <h3 style={cardTitleStyle}>{lap.title}</h3>
                    <div style={cardLocationStyle}>
                      <MapPin size={14} />
                      <span>{Number(lap.latitude).toFixed(4)}, {Number(lap.longitude).toFixed(4)}</span>
                    </div>
                  </div>

                  {/* "Milik Anda" Badge */}
                  {lap.pelapor?.nama === currentUserName && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: colors.primary,
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      fontSize: '10px',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      zIndex: 10,
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                    }}>
                      Milik Anda
                    </div>
                  )}
                </div>

                <div style={cardContentStyle}>
                  <p style={cardDescriptionStyle}>{lap.description}</p>

                  <div style={cardMetaStyle}>
                    <div style={cardMetaItemStyle}>
                      <User size={16} />
                      <span>{lap.pelapor?.nama || 'Anonymous'}</span>
                    </div>

                    <div style={statusBadgeStyle(lap.status)}>
                      {getStatusIcon(lap.status)}
                      <span>{lap.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {filteredReports.length > itemsPerPage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '40px', flexWrap: 'wrap' }}>

            {/* Pages Label */}
            <div style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 'bold',
              fontSize: '14px',
              borderRadius: borderRadius.md,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              Halaman
            </div>

            {/* Previous */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{
                ...paginationButtonStyle(false),
                borderRadius: borderRadius.md,
                opacity: currentPage === 1 ? 0.3 : 1,
                cursor: currentPage === 1 ? 'default' : 'pointer'
              }}
            >
              «
            </button>

            {/* Page Numbers */}
            {(() => {
              const buttons = [];
              if (totalPages <= 5) {
                for (let i = 1; i <= totalPages; i++) buttons.push(i);
              } else {
                if (currentPage <= 3) {
                  buttons.push(1, 2, 3, '...', totalPages);
                } else if (currentPage >= totalPages - 2) {
                  buttons.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
                } else {
                  buttons.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                }
              }

              return buttons.map((btn, idx) => (
                <button
                  key={idx}
                  onClick={() => typeof btn === 'number' ? paginate(btn) : null}
                  disabled={btn === '...'}
                  style={{
                    ...paginationButtonStyle(currentPage === btn),
                    borderRadius: borderRadius.md,
                    cursor: btn === '...' ? 'default' : 'pointer'
                  }}
                >
                  {btn}
                </button>
              ));
            })()}

            {/* Next */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{
                ...paginationButtonStyle(false),
                borderRadius: borderRadius.md,
                opacity: currentPage === totalPages ? 0.3 : 1,
                cursor: currentPage === totalPages ? 'default' : 'pointer'
              }}
            >
              Berikutnya »
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default Dashboard;