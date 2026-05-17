/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  User, 
  Heart, 
  ShoppingBag, 
  Instagram, 
  Twitter, 
  Facebook, 
  Menu, 
  X,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  LogOut,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';

// Local backup if database is empty
const defaultProcedures = [
  { id: '1', name: 'Extensão Clássica', price: 120, image: 'https://images.unsplash.com/photo-1583307132135-06041ec3093c?auto=format&fit=crop&q=80&w=600' },
  { id: '2', name: 'Volume Híbrido', price: 150, image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=600' },
  { id: '3', name: 'Volume Russo', price: 180, image: 'https://images.unsplash.com/photo-1628191139360-4083564d03fd?auto=format&fit=crop&q=80&w=600' },
  { id: '4', name: 'Lash Lifting', price: 100, image: 'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?auto=format&fit=crop&q=80&w=600' },
];

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    service: 'Volume Russo'
  });

  // Admin and Dynamic Data State
  const [procedures, setProcedures] = useState(defaultProcedures);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({
    hero_image: 'https://images.unsplash.com/photo-1583307132135-06041ec3093c?auto=format&fit=crop&q=80&w=1200',
    hero_tagline: 'realce sua beleza natural',
    hero_title_accent: 'descubra o poder de um',
    hero_title_main: 'Olhar Marcante',
    about_image: 'https://images.unsplash.com/photo-1544457070-4cd773b4d71e?auto=format&fit=crop&q=80&w=1200',
    about_tagline: 'especialista em cílios',
    about_title_large: 'Isis',
    about_title_serif: 'Figueiredo',
    about_description: 'Lash Designer certificada internacionalmente, dedicada a realçar o seu olhar com técnicas exclusivas e personalizadas. Cada aplicação é uma obra de arte pensada para você.',
    cta_title: 'Pronta para transformar seu olhar?',
    cta_description: 'Agende sua consultoria personalizada ou tire suas dúvidas. Salvaremos seu contato em nossa base de dados.',
    promo_text: '✨ PROMOÇÃO DO MÊS: 20% OFF EM VOLUME RUSSO — AGENDE SEU HORÁRIO! ✨',
    procedures_tagline: 'nossas técnicas',
    procedures_title: 'Meus Procedimentos',
    procedures_description: 'Técnicas exclusivas desenvolvidas para realçar a beleza única de cada olhar.',
    main_title_bold: 'Isis',
    main_title_serif: 'Lash Designer.',
    instagram_url: '#',
    twitter_url: '#',
    facebook_url: '#',
    whatsapp_number: '5511999999999'
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditSettingsModal, setShowEditSettingsModal] = useState(false);
  const [editingSetting, setEditingSetting] = useState<{ key: string; value: string } | null>(null);
  const [newProcedure, setNewProcedure] = useState({ name: '', price: '', image: '' });
  const [editingProcedure, setEditingProcedure] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const editSettingFileRef = useRef<HTMLInputElement>(null);
  const addProcedureFileRef = useRef<HTMLInputElement>(null);

  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProcedures();
    fetchSettings();
    checkUser();
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchAppointments();
    }
  }, [isLoggedIn]);

  const fetchProcedures = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('procedures').select('*').order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      setProcedures(data);
    }
  };

  const fetchSettings = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('site_settings').select('*');
    if (!error && data) {
      const settingsMap: Record<string, string> = { ...siteSettings };
      data.forEach((s: { key: string; value: string }) => {
        settingsMap[s.key] = s.value;
      });
      setSiteSettings(settingsMap);
    }
  };

  const updateSetting = async (key: string, value: string, imageFile?: File | null, shouldClose = true) => {
    if (!supabase) {
      alert('Supabase não configurado.');
      return false;
    }

    let finalValue = value;
    if (imageFile && key.toLowerCase().includes('image')) {
      const uploadedUrl = await uploadImage(imageFile);
      if (uploadedUrl) finalValue = uploadedUrl;
      else return false;
    }

    const { error } = await supabase
      .from('site_settings')
      .upsert({ key, value: finalValue }, { onConflict: 'key' });
    
    if (!error) {
      setSiteSettings(prev => ({ ...prev, [key]: finalValue }));
      if (shouldClose) {
        setShowEditSettingsModal(false);
        setEditingSetting(null);
      }
      return true;
    } else {
      alert('Erro ao atualizar: ' + error.message);
      return false;
    }
  };

  const checkUser = async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      alert('Configuração do Supabase não encontrada. Por favor, configure as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas configurações s.');
      return;
    }
    
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword(loginForm);
      if (!error) {
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setLoginForm({ email: '', password: '' });
      } else {
        alert('Erro no login: ' + error.message);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      alert('Erro inesperado no sistema. Verifique o console.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      setIsLoggedIn(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const uploadImage = async (file: File) => {
    if (!supabase) return null;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `site-assets/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images') // Assumes a bucket named 'images' exists
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert('Erro no upload: ' + (error.message || 'Verifique se o bucket "images" foi criado no Supabase.'));
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddProcedure = async (e: React.FormEvent, imageFile?: File | null) => {
    e.preventDefault();
    if (!supabase) {
      alert('Supabase não configurado.');
      return;
    }

    let imageUrl = newProcedure.image;
    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (uploadedUrl) imageUrl = uploadedUrl;
      else return; // Stop if upload failed
    }

    const { data, error } = await supabase
      .from('procedures')
      .insert([{ ...newProcedure, image: imageUrl, price: parseFloat(newProcedure.price.replace('R$', '').trim()) }])
      .select();
    
    if (!error) {
      setProcedures([...procedures, data[0]]);
      setShowAddModal(false);
      setNewProcedure({ name: '', price: '', image: '' });
    } else {
      alert('Erro ao adicionar: ' + error.message);
    }
  };

  const handleDeleteProcedure = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('procedures').delete().eq('id', id);
    if (!error) {
      setProcedures(procedures.filter(p => p.id !== id));
    }
  };

  const handleUpdateProcedure = async (id: string, updates: any, imageFile?: File | null) => {
    if (!supabase) return;
    
    let finalUpdates = { ...updates };
    if (imageFile) {
      const uploadedUrl = await uploadImage(imageFile);
      if (uploadedUrl) finalUpdates.image = uploadedUrl;
      else return;
    }

    const { error } = await supabase.from('procedures').update(finalUpdates).eq('id', id);
    if (!error) {
      setProcedures(prev => prev.map(p => p.id === id ? { ...p, ...finalUpdates } : p));
      setEditingProcedure(null);
    } else {
      alert('Erro ao atualizar procedimento: ' + error.message);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (!error) {
      setAppointments(prev => prev.filter(a => a.id !== id));
    }
  };

  const fetchAppointments = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setAppointments(data);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supabase) {
      alert('Configuração do Supabase não encontrada. Por favor, configure as chaves VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      setBookingStatus('error');
      return;
    }

    setBookingStatus('loading');

    try {
      const message = `Olá, gostaria de marcar um horário para fazer ${formData.service}`;
      const whatsappUrl = `https://wa.me/${siteSettings.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      
      const { error } = await supabase
        .from('appointments')
        .insert([
          { 
            service: formData.service,
            name: 'Cliente WhatsApp',
            phone: 'Enviado via Link',
            email: 'whatsapp@link.com'
          }
        ]);

      if (error) throw error;
      
      setBookingStatus('success');
      setFormData({ service: 'Volume Russo' });
      
      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');
      
      // Refresh list if admin is watching
      if (isLoggedIn) {
        fetchAppointments();
      }
    } catch (error) {
      console.error('Error booking:', error);
      setBookingStatus('error');
    }
  };

  const banners = [
    {
      image: siteSettings.about_image,
      tagline: siteSettings.about_tagline,
      description: siteSettings.about_description,
      imageKey: 'about_image',
      taglineKey: 'about_tagline',
      descriptionKey: 'about_description'
    },
    {
      image: siteSettings.banner2_image || 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=1200',
      tagline: siteSettings.banner2_tagline || 'qualidade e precisão',
      description: siteSettings.banner2_description || 'Equipamentos de última geração e materiais premium para o melhor resultado.',
      imageKey: 'banner2_image',
      taglineKey: 'banner2_tagline',
      descriptionKey: 'banner2_description'
    },
    {
      image: siteSettings.banner3_image || 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&q=80&w=1200',
      tagline: siteSettings.banner3_tagline || 'conforto e cuidado',
      description: siteSettings.banner3_description || 'Ambiente climatizado e relaxante para que sua sessão seja um momento de spa.',
      imageKey: 'banner3_image',
      taglineKey: 'banner3_tagline',
      descriptionKey: 'banner3_description'
    }
  ];

  const nextBanner = () => setBannerIndex((prev) => (prev + 1) % banners.length);
  const prevBanner = () => setBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);

  useEffect(() => {
    const timer = setInterval(() => {
      nextBanner();
    }, 5000);
    return () => clearInterval(timer);
  }, [bannerIndex]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (showEditSettingsModal && editSettingFileRef.current) {
      editSettingFileRef.current.value = '';
    }
  }, [showEditSettingsModal]);

  return (
    <div className="min-h-screen bg-white selection:bg-kindness-pink selection:text-kindness-accent">
      {/* 1. HEADER */}
      <header className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]' : 'bg-transparent'}`}>
        {/* Announcement Bar */}
        <div className="bg-kindness-pink-dark py-2.5 px-4 text-center border-b border-black/5 relative">
          <p className="text-[10px] md:text-xs font-bold text-kindness-text uppercase tracking-[0.2em]">
            {siteSettings.promo_text}
          </p>
          {isLoggedIn && (
            <button 
              onClick={() => {
                setEditingSetting({ key: 'promo_text', value: siteSettings.promo_text });
                setShowEditSettingsModal(true);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-white shadow-sm backdrop-blur-md rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all"
              title="Editar Promoção"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Main Header Container */}
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-3 md:py-5 flex items-center justify-between">
          <div className="flex-1 flex items-center gap-6">
            <div className="hidden xl:flex items-center gap-5 text-kindness-text/40">
              <a href={siteSettings.instagram_url} target="_blank" rel="noreferrer" className="hover:text-kindness-accent transition-colors">
                <Instagram className="w-4 h-4 stroke-[1.5]" />
              </a>
              <a href={siteSettings.twitter_url} target="_blank" rel="noreferrer" className="hover:text-kindness-accent transition-colors">
                <Twitter className="w-4 h-4 stroke-[1.5]" />
              </a>
              <a href={siteSettings.facebook_url} target="_blank" rel="noreferrer" className="hover:text-kindness-accent transition-colors">
                <Facebook className="w-4 h-4 stroke-[1.5]" />
              </a>
              {isLoggedIn && (
                <button 
                  onClick={() => {
                    setEditingSetting({ key: 'social_links', value: 'Links de Redes Sociais' });
                    setShowEditSettingsModal(true);
                  }}
                  className="p-1 px-2 text-[8px] font-bold uppercase bg-kindness-accent/10 rounded-md text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all ml-1"
                >
                  Editar Links
                </button>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 relative group/logo">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold tracking-[-0.04em] text-kindness-text text-center">
              {siteSettings.main_title_bold} <span className="serif font-light text-kindness-accent/80 italic ml-1 block sm:inline">{siteSettings.main_title_serif}</span>
            </h1>
            {isLoggedIn && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex gap-1.5 z-30 w-max">
                <button 
                  onClick={() => {
                    setEditingSetting({ key: 'main_title_bold', value: siteSettings.main_title_bold });
                    setShowEditSettingsModal(true);
                  }}
                  className="bg-white/95 backdrop-blur-md shadow-lg border border-kindness-accent/20 px-3 py-1.5 rounded-full text-[8px] font-black uppercase text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all whitespace-nowrap"
                >
                  Nome
                </button>
                <button 
                  onClick={() => {
                    setEditingSetting({ key: 'main_title_serif', value: siteSettings.main_title_serif });
                    setShowEditSettingsModal(true);
                  }}
                  className="bg-white/95 backdrop-blur-md shadow-lg border border-kindness-accent/20 px-3 py-1.5 rounded-full text-[8px] font-black uppercase text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all whitespace-nowrap"
                >
                  Sobrenome
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-end gap-3 md:gap-6">
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                <span className="hidden md:block text-[10px] font-bold uppercase tracking-widest text-kindness-accent bg-kindness-accent/10 px-3 py-1 rounded-full">Admin Modo</span>
                <button 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-1 hover:text-kindness-accent transition-colors flex items-center gap-1 group disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <div className="w-4 h-4 border-2 border-kindness-accent/30 border-t-kindness-accent rounded-full animate-spin"></div>
                  ) : (
                    <LogOut className="w-5 h-5 stroke-[1.5]" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden lg:block group-hover:translate-x-1 transition-transform">
                    {isLoggingOut ? 'Saindo...' : 'Sair'}
                  </span>
                </button>
              </div>
            ) : (
              <User 
                onClick={() => setShowLoginModal(true)}
                className="w-5 h-5 cursor-pointer hover:text-kindness-accent transition-colors stroke-[1.5]" 
              />
            )}
            <button 
              id="mobile-menu-btn"
              className="lg:hidden p-1 -mr-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 bg-white z-[100] lg:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-black/5">
                <h2 className="text-xl font-display font-bold tracking-tight">Menu</h2>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 bg-kindness-beige rounded-full hover:bg-kindness-accent hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 flex flex-col justify-center">
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className="text-3xl font-display font-bold text-kindness-text text-balance">Siga meu trabalho nas redes sociais</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto w-full">
                    <div className="relative group/editlink">
                      <a 
                        href={siteSettings.instagram_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-4 p-4 bg-kindness-beige rounded-2xl hover:bg-kindness-accent hover:text-white transition-all group"
                      >
                        <div className="w-10 h-10 bg-white flex items-center justify-center rounded-xl group-hover:bg-white/20">
                          <Instagram className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm">Instagram</span>
                      </a>
                      {isLoggedIn && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingSetting({ key: 'instagram_url', value: siteSettings.instagram_url });
                            setShowEditSettingsModal(true);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white shadow-md rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all z-10"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="relative group/editlink">
                      <a 
                        href={siteSettings.twitter_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-4 p-4 bg-kindness-beige rounded-2xl hover:bg-kindness-accent hover:text-white transition-all group"
                      >
                        <div className="w-10 h-10 bg-white flex items-center justify-center rounded-xl group-hover:bg-white/20">
                          <Twitter className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm">Twitter (X)</span>
                      </a>
                      {isLoggedIn && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingSetting({ key: 'twitter_url', value: siteSettings.twitter_url });
                            setShowEditSettingsModal(true);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white shadow-md rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all z-10"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="relative group/editlink">
                      <a 
                        href={siteSettings.facebook_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-4 p-4 bg-kindness-beige rounded-2xl hover:bg-kindness-accent hover:text-white transition-all group"
                      >
                        <div className="w-10 h-10 bg-white flex items-center justify-center rounded-xl group-hover:bg-white/20">
                          <Facebook className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm">Facebook</span>
                      </a>
                      {isLoggedIn && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingSetting({ key: 'facebook_url', value: siteSettings.facebook_url });
                            setShowEditSettingsModal(true);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-white shadow-md rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all z-10"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 pb-12 border-t border-black/5 flex items-center justify-center">
                <p className="text-[10px] font-bold text-kindness-text/30 uppercase tracking-widest">© 2024 Isis Lash Designer</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className={`pt-[150px] lg:pt-[180px] transition-[padding] duration-500 ${scrolled ? 'lg:pt-[110px]' : ''}`}>
        {/* 2. HERO SECTION */}
        <section className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 relative pt-2 lg:pt-0">
          <div className="flex flex-col lg:flex-row items-stretch min-h-[400px] lg:h-[calc(100vh-200px)] max-h-[750px] rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)]">
            {/* Left Image Column (Banner) */}
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="relative w-full lg:w-5/12 h-[280px] lg:h-auto overflow-hidden bg-kindness-beige"
            >
              <img 
                src={siteSettings.hero_image} 
                alt="Isis Lash Designer" 
                className="w-full h-full object-cover lg:object-center"
              />
              {/* Overlay for better mobile reading if needed */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent lg:hidden" />
              
              {isLoggedIn && (
                <div className="absolute top-6 left-6 z-30">
                  <button 
                    onClick={() => {
                      setEditingSetting({ key: 'hero_image', value: siteSettings.hero_image });
                      if (editSettingFileRef.current) editSettingFileRef.current.value = '';
                      setShowEditSettingsModal(true);
                    }}
                    className="flex items-center gap-2 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-kindness-accent hover:text-white transition-all border border-black/5"
                  >
                    <div className="w-5 h-5 bg-kindness-accent/10 rounded-full flex items-center justify-center">
                      <Camera className="w-3 h-3 text-kindness-accent group-hover:text-white" />
                    </div>
                    Alterar Foto de Capa
                  </button>
                </div>
              )}
            </motion.div>

            {/* Right Content Column */}
            <div className="w-full lg:w-7/12 flex items-center justify-center p-8 md:p-12 lg:p-16 bg-white">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-8 max-w-xl w-full"
              >
                <div className="space-y-6 relative text-center lg:text-left">
                  <div className="group/tagline flex items-center gap-3 justify-center lg:justify-start mt-4 lg:mt-0">
                    <p className="text-sm md:text-base font-bold uppercase tracking-[0.3em] text-kindness-accent/60">
                      {siteSettings.hero_tagline}
                    </p>
                    {isLoggedIn && (
                      <button 
                        onClick={() => {
                          setEditingSetting({ key: 'hero_tagline', value: siteSettings.hero_tagline });
                          setShowEditSettingsModal(true);
                        }}
                        className="p-1 shadow-md bg-white rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all flex-shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="group/txt1 flex items-center gap-3 justify-center lg:justify-start">
                      <p className="text-lg md:text-2xl serif text-kindness-text-light italic font-light">{siteSettings.hero_title_accent}</p>
                      {isLoggedIn && (
                        <button 
                          onClick={() => {
                            setEditingSetting({ key: 'hero_title_accent', value: siteSettings.hero_title_accent });
                            setShowEditSettingsModal(true);
                          }}
                          className="p-1 shadow-md bg-white rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all flex-shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    <div className="group/title flex items-center gap-3 justify-center lg:justify-start">
                      <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.85] tracking-[-0.05em] text-kindness-text text-balance">
                        {siteSettings.hero_title_main}
                      </h2>
                      {isLoggedIn && (
                        <button 
                          onClick={() => {
                            setEditingSetting({ key: 'hero_title_main', value: siteSettings.hero_title_main });
                            setShowEditSettingsModal(true);
                          }}
                          className="p-1 shadow-md bg-white rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all flex-shrink-0"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
                  <button className="btn-primary group flex items-center justify-center gap-3">
                    Agendar Agora
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                  </button>
                  <button className="px-10 py-5 rounded-full border border-black/10 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                    Ver Procedimentos
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 3. PROCEDURES CAROUSEL (NEW DESIGN) */}
        <section className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 border-t border-black/[0.03] overflow-hidden">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-8">
            <div className="space-y-4 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.4em] text-kindness-accent/60">{siteSettings.procedures_tagline}</span>
                {isLoggedIn && (
                  <button 
                    onClick={() => {
                      setEditingSetting({ key: 'procedures_tagline', value: siteSettings.procedures_tagline });
                      setShowEditSettingsModal(true);
                    }}
                    className="p-1 shadow-sm bg-white rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all"
                  >
                    <Plus className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-display font-bold tracking-tight leading-none text-kindness-text flex items-center gap-2 flex-wrap justify-center lg:justify-start">
                  {siteSettings.procedures_title}
                  {isLoggedIn && (
                    <button 
                      onClick={() => {
                        setEditingSetting({ key: 'procedures_title', value: siteSettings.procedures_title });
                        setShowEditSettingsModal(true);
                      }}
                      className="p-1.5 shadow-md bg-white rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all flex-shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </h2>
              </div>
              <div className="relative group/procdesc flex items-start gap-4">
                <p className="text-kindness-text-light">{siteSettings.procedures_description}</p>
                {isLoggedIn && (
                  <button 
                    onClick={() => {
                      setEditingSetting({ key: 'procedures_description', value: siteSettings.procedures_description });
                      setShowEditSettingsModal(true);
                    }}
                    className="p-1.5 shadow-md bg-white rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all flex-shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {isLoggedIn && (
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-6 py-3 bg-kindness-pink rounded-full hover:bg-kindness-pink-dark transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Adicionar Novo
                </button>
              )}
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    if (carouselRef.current) carouselRef.current.scrollBy({ left: -350, behavior: 'smooth' });
                  }}
                  className="w-14 h-14 flex items-center justify-center border border-black/5 bg-white rounded-full hover:bg-kindness-text hover:text-white transition-all shadow-sm group"
                >
                  <ChevronLeft className="w-6 h-6 transition-transform group-active:scale-90" />
                </button>
                <button 
                  onClick={() => {
                    if (carouselRef.current) carouselRef.current.scrollBy({ left: 350, behavior: 'smooth' });
                  }}
                  className="w-14 h-14 flex items-center justify-center border border-black/5 bg-white rounded-full hover:bg-kindness-text hover:text-white transition-all shadow-sm group"
                >
                  <ChevronRight className="w-6 h-6 transition-transform group-active:scale-90" />
                </button>
              </div>
            </div>
          </div>
          
          <div 
            ref={carouselRef}
            className="flex gap-8 overflow-x-auto pb-12 hide-scrollbar snap-x snap-mandatory cursor-grab active:cursor-grabbing"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {procedures.map((product, idx) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.8 }}
                className="w-[240px] md:w-[300px] flex-shrink-0 group cursor-pointer snap-start relative"
              >
                <div className="relative overflow-hidden rounded-2xl w-full h-[220px] md:h-[280px] mb-4 bg-kindness-beige/30 transition-transform duration-700 group-hover:scale-[1.02]">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500"></div>

                  {isLoggedIn && (
                    <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProcedure(product);
                        }}
                        className="p-2.5 bg-white/90 backdrop-blur-md text-kindness-accent rounded-full hover:bg-kindness-accent hover:text-white hover:scale-110 transition-all"
                        title="Editar Imagem/Dados"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProcedure(product.id);
                        }}
                        className="p-2.5 bg-red-500/90 backdrop-blur-md text-white rounded-full hover:bg-red-600 hover:scale-110 transition-all"
                        title="Excluir Procedimento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <button className="w-full bg-white text-kindness-text py-3 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-2xl hover:bg-kindness-text hover:text-white transition-colors">
                      Ver mais
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 px-1">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="font-display font-bold text-base md:text-lg group-hover:text-kindness-accent transition-colors leading-tight">{product.name}</h4>
                    <p className="text-kindness-text-light font-bold text-sm">R$ {product.price}</p>
                  </div>
                  <p className="text-[10px] text-kindness-text-light/50 font-medium uppercase tracking-[0.1em]">Técnica Especializada</p>
                </div>
              </motion.div>
            ))}
            
            {/* Empty state for the end of carousel */}
            <div className="min-w-[100px] flex-shrink-0"></div>
          </div>
        </section>

        <section className="bg-white py-12 md:py-20 relative overflow-hidden">
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 relative pt-2 lg:pt-0">
            <div className="relative min-h-[450px] lg:h-[calc(100vh-250px)] max-h-[700px] rounded-[2rem] lg:rounded-[3rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] group">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={bannerIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute inset-0 w-full h-full"
                >
                  {/* Full Image Banner */}
                  <div className="absolute inset-0 w-full h-full bg-kindness-beige">
                    <img 
                      src={banners[bannerIndex].image} 
                      alt={`Banner ${bannerIndex + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 md:bg-black/20" />
                    
                    {isLoggedIn && (
                      <div className="absolute top-8 left-8 z-30">
                        <button 
                          onClick={() => {
                            setEditingSetting({ key: banners[bannerIndex].imageKey, value: banners[bannerIndex].image });
                            if (editSettingFileRef.current) editSettingFileRef.current.value = '';
                            setShowEditSettingsModal(true);
                          }}
                          className="flex items-center gap-2 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-kindness-accent hover:text-white transition-all border border-black/5"
                        >
                          <Camera className="w-4 h-4" /> Alterar Foto de Banner {bannerIndex + 1}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Centered Content Overlay */}
                  <div className="relative z-10 w-full h-full flex items-center justify-center p-8 md:p-12 lg:p-16">
                    <motion.div 
                      key={`content-${bannerIndex}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05, duration: 0.2 }}
                      className="space-y-6 max-w-2xl w-full text-center"
                    >
                      <div className="flex items-center gap-3 justify-center">
                        <span className="text-xs md:text-sm font-black uppercase tracking-[0.4em] text-white/90 drop-shadow-sm">
                          {banners[bannerIndex].tagline}
                        </span>
                        {isLoggedIn && (
                          <button 
                            onClick={() => {
                              setEditingSetting({ key: banners[bannerIndex].taglineKey, value: banners[bannerIndex].tagline });
                              setShowEditSettingsModal(true);
                            }}
                            className="p-1 shadow-sm bg-white rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                      
                      <div className="relative group/bio">
                        <p className="text-xl md:text-2xl lg:text-3xl font-display font-medium text-white leading-tight drop-shadow-md">
                          {banners[bannerIndex].description}
                        </p>
                        {isLoggedIn && (
                          <button 
                            onClick={() => {
                              setEditingSetting({ key: banners[bannerIndex].descriptionKey, value: banners[bannerIndex].description });
                              setShowEditSettingsModal(true);
                            }}
                            className="absolute -top-8 left-1/2 -translate-x-1/2 p-1.5 shadow-md bg-white rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Controls */}
              <div className="absolute inset-0 flex items-center justify-between p-4 md:p-8 pointer-events-none z-20">
                <button 
                  onClick={prevBanner}
                  className="p-3 md:p-4 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white hover:text-kindness-text transition-all pointer-events-auto opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 duration-500"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={nextBanner}
                  className="p-3 md:p-4 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white hover:text-kindness-text transition-all pointer-events-auto opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 duration-500"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Indicators */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-30">
                {banners.map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setBannerIndex(i)}
                    className={`h-1.5 transition-all duration-500 rounded-full ${i === bannerIndex ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 6. SUBSCRIBE SECTION (Now Appointment) */}
        <section className="max-w-[1440px] mx-auto px-6 md:px-12 mb-32">
          <div className="bg-kindness-beige rounded-[4rem] p-12 md:p-32 text-center relative overflow-hidden group">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[40%] aspect-square bg-kindness-pink/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-[3s]"></div>
            <div className="absolute bottom-0 left-0 w-[30%] aspect-square bg-kindness-green/40 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

            <div className="relative z-10 max-w-2xl mx-auto space-y-10">
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-[0.4em] text-kindness-accent/60">Isis Lash Designer</span>
                <h2 className="text-4xl md:text-6xl font-display font-bold leading-tight tracking-tight text-balance flex items-center justify-center gap-4">
                  {siteSettings.cta_title}
                  {isLoggedIn && (
                    <button 
                      onClick={() => {
                        setEditingSetting({ key: 'cta_title', value: siteSettings.cta_title });
                        setShowEditSettingsModal(true);
                      }}
                      className="p-2 shadow-lg bg-white rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </h2>
                <div className="relative inline-flex items-center justify-center gap-4 w-full">
                  <p className="text-lg text-kindness-text-light">
                    {siteSettings.cta_description}
                  </p>
                  {isLoggedIn && (
                    <button 
                      onClick={() => {
                        setEditingSetting({ key: 'cta_description', value: siteSettings.cta_description });
                        setShowEditSettingsModal(true);
                      }}
                      className="p-1.5 shadow-md bg-white rounded-full text-kindness-accent hover:bg-kindness-accent hover:text-white transition-all flex-shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {bookingStatus === 'success' ? (
                <div className="bg-white/60 backdrop-blur-md p-10 rounded-full flex items-center justify-center gap-4 text-kindness-text font-bold">
                  <CheckCircle2 className="text-green-500 w-8 h-8" />
                  Solicitação enviada com sucesso!
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-6">
                  <form onSubmit={handleBooking} className="flex flex-col gap-4">
                    <div className="relative group/booking-select">
                      <select 
                        value={formData.service}
                        onChange={(e) => setFormData({...formData, service: e.target.value})}
                        className="w-full px-8 py-5 bg-white rounded-full outline-none text-base font-bold text-kindness-text appearance-none cursor-pointer focus:ring-4 focus:ring-kindness-pink/20 transition-all border border-black/5"
                      >
                        {procedures.map((p) => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                        <ArrowRight className="w-5 h-5 rotate-90" />
                      </div>
                      
                      {isLoggedIn && (
                        <button 
                          type="button"
                          onClick={() => setShowAddModal(true)}
                          className="absolute -right-14 top-1/2 -translate-y-1/2 p-3 bg-kindness-accent text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
                          title="Adicionar Novo Procedimento"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <button 
                      disabled={bookingStatus === 'loading'}
                      className="w-full bg-kindness-text text-white px-10 py-5 rounded-full text-base font-black uppercase tracking-[0.2em] hover:bg-black transition-all hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] disabled:opacity-50"
                    >
                      {bookingStatus === 'loading' ? 'Enviando...' : 'Solicitar Agendamento'}
                    </button>
                    {bookingStatus === 'error' && (
                      <p className="text-xs text-red-500 mt-2">Ocorreu um erro ao enviar. Tente novamente.</p>
                    )}
                  </form>
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-kindness-text/20">
                  horários flexíveis de segunda a sábado.
                </p>
                {isLoggedIn && (
                  <button 
                    onClick={() => {
                      const setting = { key: 'whatsapp_number', value: siteSettings.whatsapp_number };
                      setEditingSetting(setting);
                      if (editSettingFileRef.current) editSettingFileRef.current.value = '';
                      setShowEditSettingsModal(true);
                    }}
                    className="text-[8px] font-black uppercase tracking-[0.2em] text-kindness-accent hover:underline bg-white/50 px-3 py-1 rounded-full shadow-sm border border-kindness-accent/10"
                  >
                    Editar WhatsApp: {siteSettings.whatsapp_number}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {isLoggedIn && (
          <section id="appointments-dashboard" className="max-w-[1440px] mx-auto px-6 md:px-12 py-24 bg-kindness-beige/20 border-y border-black/[0.03]">
            <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-8">
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-[0.4em] text-kindness-accent">Painel de Agendamentos</span>
                <h2 className="text-5xl md:text-6xl font-display font-bold tracking-tight">Solicitações Recentes</h2>
                <p className="text-kindness-text-light">Lista de contatos interessados em seus serviços.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white px-6 py-3 rounded-full shadow-sm border border-black/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-kindness-text-light">
                    Total: <span className="text-kindness-accent">{appointments.length}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-kindness-accent/5 border-b border-black/[0.03]">
                      <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-kindness-text/60">Data/Hora</th>
                      <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-kindness-text/60">Cliente</th>
                      <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-kindness-text/60">Contato</th>
                      <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-kindness-text/60">Serviço</th>
                      <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-kindness-text/60 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.03]">
                    {appointments.length > 0 ? (
                      appointments.map((apt) => (
                        <tr key={apt.id} className="hover:bg-white/40 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-kindness-text">{new Date(apt.created_at).toLocaleDateString('pt-BR')}</span>
                              <span className="text-[10px] text-kindness-text-light/60 uppercase font-medium">{new Date(apt.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-sm font-bold text-kindness-text">{apt.name}</p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-kindness-text-light">{apt.phone}</span>
                              {apt.email && <span className="text-[10px] text-kindness-text-light/60">{apt.email}</span>}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-xs font-bold uppercase tracking-widest text-kindness-accent bg-kindness-accent/10 px-3 py-1 rounded-full">{apt.service}</span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => handleDeleteAppointment(apt.id)}
                              className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                              title="Remover solicitação"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-kindness-text-light italic">
                          Nenhum agendamento encontrado no momento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 7. FOOTER */}
      <footer className="bg-white border-t border-black/[0.03] pt-24 pb-12">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          <div className="mb-24">
            <div className="space-y-8 max-w-lg">
              <h2 className="text-3xl font-display font-bold tracking-tighter">
                Isis <span className="serif font-light text-kindness-accent/70">Lash Designer.</span>
              </h2>
              <p className="text-sm text-kindness-text-light leading-relaxed">
                Elevando o seu olhar através de técnicas exclusivas e personalizadas. Especialista em extensões de cílios e design facial.
              </p>
              <div className="flex gap-6 text-kindness-text/40">
                <Instagram className="w-5 h-5 cursor-pointer hover:text-kindness-accent transition-colors" />
                <Twitter className="w-5 h-5 cursor-pointer hover:text-kindness-accent transition-colors" />
                <Facebook className="w-5 h-5 cursor-pointer hover:text-kindness-accent transition-colors" />
              </div>
            </div>
          </div>

          <div className="pt-12 border-t border-black/[0.03] flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-kindness-text/30">
            <p>© {new Date().getFullYear()} ISIS LASH DESIGNER. TODOS OS DIREITOS RESERVADOS.</p>
            <div className="flex gap-8">
              <button 
                onClick={() => isLoggedIn ? handleLogout() : setShowLoginModal(true)}
                disabled={isLoggingOut}
                className="hover:text-kindness-accent transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <div className="w-3 h-3 border border-kindness-accent/30 border-t-kindness-accent rounded-full animate-spin"></div>
                ) : (
                  isLoggedIn ? <><LogOut className="w-3 h-3" /> Sair</> : 'Área Administrativa'
                )}
                {isLoggingOut && 'Saindo...'}
              </button>
              <a href="#" className="hover:text-kindness-accent transition-colors">Política de Privacidade</a>
              <a href="#" className="hover:text-kindness-accent transition-colors">Termos de Uso</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-[2rem] p-10 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6 hover:rotate-90 transition-transform">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-display font-bold mb-4">Login Administrativo</h2>
              <p className="text-sm text-kindness-text-light mb-8">
                Entre para acessar o painel de controle e gerenciar seu site.
              </p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-kindness-text/60 ml-4">Email</label>
                  <input 
                    type="email"
                    required
                    placeholder="exemplo@gmail.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                    className="w-full px-6 py-4 bg-kindness-beige rounded-full outline-none focus:ring-2 focus:ring-kindness-pink transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-kindness-text/60 ml-4">Senha</label>
                  <input 
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                    className="w-full px-6 py-4 bg-kindness-beige rounded-full outline-none focus:ring-2 focus:ring-kindness-pink transition-all text-sm"
                  />
                </div>
                <button type="submit" disabled={isLoggingIn} className="w-full btn-primary mt-4 flex items-center justify-center gap-3">
                  {isLoggingIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Entrando...
                    </>
                  ) : 'Entrar no Painel'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Site Settings Modal */}
      <AnimatePresence>
        {showEditSettingsModal && editingSetting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl relative"
            >
              <button onClick={() => setShowEditSettingsModal(false)} className="absolute top-8 right-8 hover:rotate-90 transition-transform">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-display font-bold mb-2">Editar Conteúdo</h2>
              <p className="text-kindness-text-light text-sm mb-8 uppercase tracking-widest font-bold">Chave: {editingSetting.key.replace(/_/g, ' ')}</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-kindness-text/60 ml-4">Valor atual (Texto ou Link)</label>
                  {editingSetting.key === 'social_links' ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold uppercase text-kindness-text/40 ml-4">Instagram URL</span>
                        <input 
                          type="text"
                          value={siteSettings.instagram_url}
                          onChange={(e) => setSiteSettings({...siteSettings, instagram_url: e.target.value})}
                          className="w-full px-6 py-3 bg-kindness-beige rounded-full outline-none focus:ring-2 focus:ring-kindness-pink transition-all text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold uppercase text-kindness-text/40 ml-4">Twitter URL</span>
                        <input 
                          type="text"
                          value={siteSettings.twitter_url}
                          onChange={(e) => setSiteSettings({...siteSettings, twitter_url: e.target.value})}
                          className="w-full px-6 py-3 bg-kindness-beige rounded-full outline-none focus:ring-2 focus:ring-kindness-pink transition-all text-sm font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold uppercase text-kindness-text/40 ml-4">Facebook URL</span>
                        <input 
                          type="text"
                          value={siteSettings.facebook_url}
                          onChange={(e) => setSiteSettings({...siteSettings, facebook_url: e.target.value})}
                          className="w-full px-6 py-3 bg-kindness-beige rounded-full outline-none focus:ring-2 focus:ring-kindness-pink transition-all text-sm font-bold"
                        />
                      </div>
                    </div>
                  ) : editingSetting.key.includes('description') ? (
                      <textarea 
                        rows={6}
                        value={editingSetting.value}
                        onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                        className="w-full px-8 py-6 bg-kindness-beige rounded-[2rem] outline-none focus:ring-2 focus:ring-kindness-pink transition-all resize-none text-sm leading-relaxed"
                      />
                    ) : (
                      <div className="relative">
                        <input 
                          type="text"
                          value={editingSetting.value.startsWith('data:') ? 'Arquivo local selecionado' : editingSetting.value}
                          onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                          className="w-full px-8 py-5 bg-kindness-beige rounded-full outline-none focus:ring-2 focus:ring-kindness-pink transition-all text-sm"
                        />
                        {editingSetting.key.includes('image') && (
                          <button 
                            onClick={() => editSettingFileRef.current?.click()}
                            className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-white/50 rounded-full transition-colors group/btn"
                            title="Carregar arquivo local"
                          >
                            <Camera className="w-4 h-4 text-kindness-accent group-hover/btn:scale-110 transition-transform" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {editingSetting.key.includes('image') && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-kindness-text/60 ml-4">Arquivo Local</span>
                        <button 
                          onClick={() => editSettingFileRef.current?.click()}
                          className="text-[10px] font-bold uppercase tracking-widest text-kindness-accent bg-kindness-accent/10 px-4 py-2 rounded-full hover:bg-kindness-accent hover:text-white transition-all flex items-center gap-2"
                        >
                          <Camera className="w-3 h-3" /> Selecionar Foto do Computador
                        </button>
                      </div>
                      
                      {editingSetting.value && (
                        <div className="aspect-video rounded-3xl overflow-hidden border-4 border-kindness-beige shadow-inner group relative">
                          <img src={editingSetting.value} className="w-full h-full object-cover" alt="Preview" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">Pré-visualização</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowEditSettingsModal(false)}
                    className="flex-1 py-4 rounded-full border border-black/5 hover:bg-black/5 transition-colors text-xs font-bold uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      if (editingSetting.key === 'social_links') {
                        // Multi-save for social links
                        setIsUploading(true);
                        Promise.all([
                          updateSetting('instagram_url', siteSettings.instagram_url, null, false),
                          updateSetting('twitter_url', siteSettings.twitter_url, null, false),
                          updateSetting('facebook_url', siteSettings.facebook_url, null, false)
                        ]).then(() => {
                          setIsUploading(false);
                          setShowEditSettingsModal(false);
                          setEditingSetting(null);
                        }).catch(() => setIsUploading(false));
                      } else {
                        updateSetting(editingSetting.key, editingSetting.value, editSettingFileRef.current?.files?.[0]);
                      }
                    }}
                    disabled={isUploading}
                    className="flex-[2] btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processando...
                      </div>
                    ) : 'Confirmar e Salvar'}
                  </button>
                </div>
              </div>
              <input 
                type="file" 
                ref={editSettingFileRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      setEditingSetting({ ...editingSetting, value: ev.target?.result as string });
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Procedure Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl relative"
            >
              <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 hover:rotate-90 transition-transform">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-display font-bold mb-8">Novo Procedimento</h2>
              <form onSubmit={(e) => handleAddProcedure(e, addProcedureFileRef.current?.files?.[0])} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-kindness-text/60 ml-4">Nome do Procedimento</label>
                  <input 
                    type="text"
                    required
                    value={newProcedure.name}
                    onChange={(e) => setNewProcedure({...newProcedure, name: e.target.value})}
                    className="w-full px-6 py-4 bg-kindness-beige rounded-full outline-none focus:ring-2 focus:ring-kindness-pink transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-kindness-text/60 ml-4">Preço sugerido (R$)</label>
                  <input 
                    type="text"
                    placeholder="ex: 150"
                    required
                    value={newProcedure.price}
                    onChange={(e) => setNewProcedure({...newProcedure, price: e.target.value})}
                    className="w-full px-6 py-4 bg-kindness-beige rounded-full outline-none focus:ring-2 focus:ring-kindness-pink transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-kindness-text/60 ml-4 flex justify-between">
                    URL da Imagem
                    <button 
                      type="button"
                      onClick={() => addProcedureFileRef.current?.click()}
                      className="text-kindness-accent hover:underline lowercase"
                    >
                      ou carregar do computador
                    </button>
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      required={!addProcedureFileRef.current?.files?.[0]}
                      value={newProcedure.image.startsWith('data:') ? 'Imagem carregada localmente' : newProcedure.image}
                      onChange={(e) => setNewProcedure({...newProcedure, image: e.target.value})}
                      className="w-full px-6 py-4 bg-kindness-beige rounded-full outline-none focus:ring-2 focus:ring-kindness-pink transition-all"
                      placeholder="https://..."
                    />
                    <Camera className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-kindness-text/20" />
                  </div>
                  <input 
                    type="file" 
                    ref={addProcedureFileRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setNewProcedure({ ...newProcedure, image: ev.target?.result as string });
                        };
                        reader.readAsDataURL(e.target.files[0]);
                      }
                    }}
                  />
                </div>
                {newProcedure.image && (
                  <div className="aspect-video rounded-2xl overflow-hidden mt-4 border-2 border-kindness-beige">
                    <img src={newProcedure.image} className="w-full h-full object-cover" alt="Preview" />
                  </div>
                )}
                <button type="submit" disabled={isUploading} className="w-full btn-primary mt-6 disabled:opacity-50">
                  {isUploading ? 'Enviando Imagem...' : 'Criar Procedimento'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Procedure Modal */}
      <AnimatePresence>
        {editingProcedure && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl relative"
            >
              <button onClick={() => setEditingProcedure(null)} className="absolute top-8 right-8 hover:rotate-90 transition-transform">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-3xl font-display font-bold mb-8">Editar Procedimento</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-kindness-text/60 ml-4">Nome</label>
                  <input 
                    type="text"
                    value={editingProcedure.name}
                    onChange={(e) => setEditingProcedure({ ...editingProcedure, name: e.target.value })}
                    className="w-full px-6 py-4 bg-kindness-beige rounded-full outline-none focus:ring-2 focus:ring-kindness-pink transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-kindness-text/60 ml-4">Preço (R$)</label>
                  <input 
                    type="text"
                    value={editingProcedure.price}
                    onChange={(e) => setEditingProcedure({ ...editingProcedure, price: e.target.value })}
                    className="w-full px-6 py-4 bg-kindness-beige rounded-full outline-none focus:ring-2 focus:ring-kindness-pink transition-all text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-kindness-text/60 ml-4 flex justify-between">
                    Foto
                    <button 
                      type="button"
                      onClick={() => addProcedureFileRef.current?.click()}
                      className="text-kindness-accent hover:underline lowercase"
                    >
                      trocar foto localmente
                    </button>
                  </label>
                  <div className="aspect-video rounded-2xl overflow-hidden border-2 border-kindness-beige group relative cursor-pointer" onClick={() => addProcedureFileRef.current?.click()}>
                    <img src={editingProcedure.image} className="w-full h-full object-cover shadow-inner" alt="Preview" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-center gap-2">
                        <Camera className="w-8 h-8 text-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Alterar Foto</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setEditingProcedure(null)}
                    className="flex-1 py-4 rounded-full border border-black/5 hover:bg-black/5 transition-colors text-xs font-bold uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleUpdateProcedure(editingProcedure.id, { name: editingProcedure.name, price: editingProcedure.price, image: editingProcedure.image }, addProcedureFileRef.current?.files?.[0])}
                    disabled={isUploading}
                    className="flex-[2] btn-primary disabled:opacity-50"
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Salvando...
                      </div>
                    ) : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

