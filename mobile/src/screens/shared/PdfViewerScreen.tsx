import { Feather } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';

import { apiUrl, getAuthToken } from '@/api';
import { ErrorState, Loading, Screen, Txt } from '@/components';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

// react-native-webview's class typings do not match React 19's JSX types yet; runtime is unaffected.
const WebView = RNWebView as unknown as React.ComponentType<Record<string, unknown>>;

/** Renders every page with PDF.js (works the same on iOS and Android, also in Expo Go); pinch to zoom. */
const viewerHtml = (base64: string, bg: string) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=5,user-scalable=yes">
<style>body{margin:0;background:${bg};}#pages{padding:10px 8px 40px}canvas{display:block;width:100%;height:auto;margin:0 auto 10px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.25)}#msg{font:14px -apple-system,Roboto,sans-serif;color:#888;text-align:center;padding:40px}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script></head>
<body><div id="msg">Opening…</div><div id="pages"></div><script>
(async function(){
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const raw=atob('${base64}'); const bytes=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++){bytes[i]=raw.charCodeAt(i);}
    const pdf=await pdfjsLib.getDocument({data:bytes}).promise; document.getElementById('msg').remove();
    window.ReactNativeWebView.postMessage(JSON.stringify({pages:pdf.numPages}));
    const width=Math.min(window.innerWidth,900)-16, ratio=Math.min(window.devicePixelRatio||2,3);
    for(let n=1;n<=pdf.numPages;n++){
      const page=await pdf.getPage(n); const base=page.getViewport({scale:1}); const scale=width/base.width;
      const vp=page.getViewport({scale:scale*ratio}); const c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height;
      document.getElementById('pages').appendChild(c); await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
    }
  } catch(e){ document.getElementById('msg').textContent='Could not open this PDF.'; window.ReactNativeWebView.postMessage(JSON.stringify({error:String(e)})); }
})();
</script></body></html>`;

/** In-app PDF viewer for judgments, documents, invoices and receipts (the same API file routes as the web). */
export function PdfViewerScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'PdfViewer'>>();
  const nav = useAppNavigation();
  const { c } = useTheme();
  const [state, setState] = useState<{ uri: string; base64: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = getAuthToken();
        const target = `${FileSystem.cacheDirectory}${(params.title || 'document').replace(/[^\w.\-]+/g, '_')}.pdf`;
        const res = await FileSystem.downloadAsync(apiUrl(`/v1${params.path}`, params.query), target, { headers: { Accept: 'application/pdf', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        if (res.status >= 400) {
          throw new Error(res.status === 403 ? 'You do not have access to this file.' : res.status === 404 ? 'This file is not available.' : `Could not load the file (${res.status}).`);
        }
        const base64 = await FileSystem.readAsStringAsync(res.uri, { encoding: FileSystem.EncodingType.Base64 });
        if (active) setState({ uri: res.uri, base64 });
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load the file.');
      }
    })();
    return () => { active = false; };
  }, [params.path, params.title, params.query]);

  useLayoutEffect(() => {
    nav.setOptions({
      title: params.title,
      headerRight: () => (state && params.shareable !== false ? (
        <Pressable hitSlop={10} onPress={() => void Sharing.shareAsync(state.uri, { mimeType: 'application/pdf', dialogTitle: params.title })}>
          <Feather name="share" size={20} color={c.text} />
        </Pressable>
      ) : null),
    });
  }, [nav, params.title, params.shareable, state, c.text]);

  if (error) return <Screen><ErrorState message={error} /></Screen>;
  if (!state) return <Loading label="Opening PDF…" />;

  return (
    <View style={{ flex: 1, backgroundColor: c.surfaceAlt }}>
      <WebView originWhitelist={['*']} source={{ html: viewerHtml(state.base64, c.surfaceAlt) }} style={{ flex: 1, backgroundColor: c.surfaceAlt }} onMessage={(e: { nativeEvent: { data: string } }) => { try { const d = JSON.parse(e.nativeEvent.data); if (d.pages) setPages(d.pages); } catch { /* ignore */ } }} setBuiltInZoomControls={false} />
      {pages ? <View style={{ position: 'absolute', bottom: 16, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)' }}><Txt variant="caption" style={{ color: '#fff' }}>{pages} page{pages === 1 ? '' : 's'}</Txt></View> : null}
    </View>
  );
}
