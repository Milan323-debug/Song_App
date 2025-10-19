import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import COLORS from '../../constants/colors'
import { useAuthStore } from '../../store/authStore'
import usePlayerStore from '../../store/playerStore'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { API } from '../../constants/api'

const { width: SCREEN_W } = Dimensions.get('window')
const PADDING = 18
const CARD_GAP = 12
const CARD_W = Math.round((SCREEN_W - PADDING * 2 - CARD_GAP) / 2)

const RECENTS_KEY = 'recentHistory'

const PillTab = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ marginRight: 10 }} activeOpacity={0.9}>
    <View style={{
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 24,
      borderWidth: active ? 0 : 0,
      backgroundColor: active ? 'transparent' : 'rgba(255,255,255,0.03)'
    }}>
      {active ? (
        <LinearGradient colors={[COLORS.primary, '#7b61ff']} style={{ borderRadius: 24, paddingHorizontal: 12, paddingVertical: 6 }} start={[0,0]} end={[1,1]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>{label}</Text>
        </LinearGradient>
      ) : (
        <Text style={{ color: COLORS.textPrimary }}>{label}</Text>
      )}
    </View>
  </TouchableOpacity>
)

const FeatureCard = ({ item, onPress }) => (
  <TouchableOpacity activeOpacity={0.9} onPress={() => onPress && onPress(item)} style={{ width: 260, height: 140, borderRadius: 12, marginRight: 12, overflow: 'hidden' }}>
    <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} />
    <LinearGradient colors={['transparent','rgba(0,0,0,0.5)']} style={{ position: 'absolute', left:0,right:0,bottom:0,top:0 }} />
    <View style={{ position: 'absolute', left: 12, bottom: 12 }}>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{item.title}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{item.subtitle}</Text>
    </View>
  </TouchableOpacity>
)

const GridCard = React.memo(({ item, onPress }) => (
  <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(item)} style={{ width: CARD_W, marginBottom: 14 }}>
    <View style={{ width: CARD_W, height: CARD_W, borderRadius: 12, overflow: 'hidden' }}>
      <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} />
      <LinearGradient colors={['transparent','rgba(0,0,0,0.48)']} style={{ position: 'absolute', left:0,right:0,bottom:0,top:0 }} />
      {item.special && (
        <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.35)', padding: 6, borderRadius: 8 }}>
          <Ionicons name="heart" size={16} color={COLORS.primary} />
        </View>
      )}
    </View>
    <Text numberOfLines={1} style={{ color: COLORS.textPrimary, fontWeight: '700', marginTop: 8 }}>{item.title}</Text>
    <Text numberOfLines={1} style={{ color: COLORS.textSecondary, marginTop: 4 }}>{item.subtitle}</Text>
  </TouchableOpacity>
))

export default function Home() {
  const authUser = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.user)
  const playTrack = usePlayerStore((s) => s.playTrack)
  const router = useRouter()
  const [tab, setTab] = useState('All')

  const [featured, setFeatured] = useState([])
  const [gridItems, setGridItems] = useState([])
  const [recents, setRecents] = useState([])
  const [loading, setLoading] = useState(true)

  const anim = useRef(new Animated.Value(0)).current

  // load initial content (stubbed or from API)
  useEffect(() => {
    // fetch public playlists created by all users and use those with artwork for the grid
    (async () => {
      try {
        const res = await fetch(API('api/playlists'))
        const json = await res.json()
        const list = Array.isArray(json.playlists) ? json.playlists : (Array.isArray(json) ? json : [])

        // Helper to pick an image from playlist or its first song
        const pickImage = (pl) => {
          if (!pl) return null
          if (pl.imageUrl) return pl.imageUrl
          if (pl.artworkUrl) return pl.artworkUrl
          if (pl.image && (pl.image.secure_url || pl.image.url)) return pl.image.secure_url || pl.image.url
          if (pl.artwork && (pl.artwork.secure_url || pl.artwork.url)) return pl.artwork.secure_url || pl.artwork.url
          if (Array.isArray(pl.images) && pl.images.length > 0) return pl.images[0].secure_url || pl.images[0].url
          // fallback to first song artwork
          if (Array.isArray(pl.songs) && pl.songs.length > 0) {
            const s = pl.songs[0]
            if (s) return s.artworkUrl || (s.artwork && (s.artwork.secure_url || s.artwork.url)) || null
          }
          return null
        }

        const withImages = list
          .map((pl) => ({
            source: pl,
            image: pickImage(pl)
          }))
          .filter(x => x.image)

        // map to grid item shape
        const grid = withImages.map(({ source, image }, idx) => ({
          id: source._id || source.id || `p${idx}`,
          title: source.title || source.name || 'Untitled',
          subtitle: source.user?.username || source.user?.name || 'Unknown',
          image,
          special: !!source.isFeatured || false,
          raw: source
        }))

        // choose first two as featured if available, otherwise fallback to small placeholders
        const featuredItems = grid.slice(0, 2).map(g => ({ id: `f_${g.id}`, title: g.title, subtitle: g.subtitle, image: g.image }))

        setFeatured(featuredItems.length ? featuredItems : [
          { id: 'f1', title: "New Music Friday", subtitle: 'Latest releases', image: 'https://picsum.photos/seed/friday/400/200' },
          { id: 'f2', title: 'Release Radar', subtitle: 'Fresh picks', image: 'https://picsum.photos/seed/radar/400/200' },
        ])

        setGridItems(grid)
      } catch (err) {
        console.warn('[Home] failed to fetch playlists', err)
        // fallback to placeholder content
        setFeatured([
          { id: 'f1', title: "New Music Friday", subtitle: 'Latest releases', image: 'https://picsum.photos/seed/friday/400/200' },
          { id: 'f2', title: 'Release Radar', subtitle: 'Fresh picks', image: 'https://picsum.photos/seed/radar/400/200' },
        ])
        const items = []
        for (let i=0;i<12;i++) items.push({ id: 'g'+i, title: `Playlist ${i+1}`, subtitle: `Curator ${i+1}`, image: `https://picsum.photos/seed/album${i}/300/300`, special: i===0 })
        setGridItems(items)
      }

      try {
        const raw = await AsyncStorage.getItem(RECENTS_KEY)
        const parsed = raw ? JSON.parse(raw) : []
        setRecents(Array.isArray(parsed) ? parsed.slice(0,8) : [])
      } catch (e) { setRecents([]) }
      setLoading(false)
    })()
  }, [])

  // animate background gradient subtly
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 6000, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 6000, useNativeDriver: false }),
      ])
    ).start()
  }, [])

  const saveRecent = useCallback(async (item) => {
    try {
      const raw = await AsyncStorage.getItem(RECENTS_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      // dedupe by id or url
      const key = item.id || item._id || item.url || item.title
      const filtered = (parsed || []).filter((x) => String(x.id || x._id || x.url || x.title) !== String(key))
      filtered.unshift({ id: key, ...item })
      const next = filtered.slice(0,8)
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next))
      setRecents(next)
    } catch (e) { /* ignore */ }
  }, [])

  const onPressCard = useCallback(async (item) => {
    // play or navigate - here we'll play a mock track if available
    try {
      // if this item represents a playlist from the grid/featured mapping, navigate to playlist detail
      const playlistId = item?.raw?._id || item?.id || item?._id
      if (playlistId) {
        // record recent visit
        saveRecent(item)
        router.push(`/Playlists/${playlistId}`)
        return
      }

      if (item.track) {
        await playTrack(item.track)
      }
      // record recent visit
      saveRecent(item)
    } catch (e) {}
  }, [playTrack, saveRecent])

  const renderHeader = useMemo(() => (
    <View style={{ paddingHorizontal: PADDING, paddingTop: 18, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <PillTab label="All" active={tab==='All'} onPress={() => setTab('All')} />
        <PillTab label="Music" active={tab==='Music'} onPress={() => setTab('Music')} />
        <PillTab label="Podcasts" active={tab==='Podcasts'} onPress={() => setTab('Podcasts')} />
      </View>

      <View style={{ height: 160 }}>
        <FlatList horizontal data={featured} keyExtractor={(i)=>i.id} showsHorizontalScrollIndicator={false} renderItem={({item}) => <FeatureCard item={item} />} />
      </View>

      <View style={{ height: 18 }} />
    </View>
  ), [tab, featured])

  const showRecents = recents && recents.length > 0

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* animated gradient background */}
      <Animated.View style={{ position: 'absolute', left:0,right:0,top:0,bottom:0, opacity: anim.interpolate({ inputRange:[0,1], outputRange:[0.5,1] }) }} pointerEvents="none">
        <LinearGradient colors={[COLORS.background, COLORS.primary, '#0b0710']} style={{ flex:1 }} start={[0,0]} end={[1,1]} />
      </Animated.View>

      <FlatList
        data={gridItems}
        keyExtractor={(i)=>i.id}
        ListHeaderComponent={
          <>
            {renderHeader}
            {showRecents && (
              <View style={{ paddingHorizontal: PADDING, marginBottom: 12 }}>
                <Text style={{ color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Recents</Text>
                <FlatList horizontal data={recents} keyExtractor={(i)=>i.id} showsHorizontalScrollIndicator={false} renderItem={({item}) => (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => onPressCard(item)} style={{ marginRight: 12 }}>
                    <View style={{ width: 120, height: 120, borderRadius: 10, overflow: 'hidden' }}>
                      <Image source={{ uri: item.image || `https://picsum.photos/seed/${item.id}/300/300` }} style={{ width: '100%', height: '100%' }} />
                    </View>
                    <Text numberOfLines={1} style={{ color: COLORS.textPrimary, width: 120 }}>{item.title}</Text>
                  </TouchableOpacity>
                )} />
              </View>
            )}
            <View style={{ paddingHorizontal: PADDING, marginTop: 8 }}>
              <Text style={{ color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Friday drops picked for you</Text>
            </View>
          </>
        }
        renderItem={({ item, index }) => {
          // render in a 2-column grid via column wrapper
          if (index % 2 === 0) {
            const left = item
            const right = gridItems[index+1]
            return (
              <View style={{ flexDirection: 'row', paddingHorizontal: PADDING, justifyContent: 'space-between' }}>
                <GridCard item={left} onPress={onPressCard} />
                {right ? <GridCard item={right} onPress={onPressCard} /> : <View style={{ width: CARD_W }} />}
              </View>
            )
          }
          return null
        }}
        ListFooterComponent={<View style={{ height: 120 }} />}
        showsVerticalScrollIndicator={false}
      />

      {/* bottom fade so player blends */}
      <LinearGradient colors={['transparent', COLORS.background]} style={{ position: 'absolute', left:0,right:0,bottom:0,height:120 }} />
    </View>
  )
}

// styles are loaded from assets/styles/songs.styles.js
