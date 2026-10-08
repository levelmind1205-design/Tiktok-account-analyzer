import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app=express();
const PORT=process.env.PORT||3000;
const TOKEN=process.env.APIFY_TOKEN;
const ACTOR="xtracto~tiktok-profile-scraper";

app.use(express.json({limit:"50kb"}));
app.use(express.static("public"));

const n=v=>Number(v||0);
const cleanUser=s=>String(s||"").trim().replace(/^@/,"").replace(/^https?:\/\/(www\.)?tiktok\.com\/@/,"").split(/[/?#]/)[0];

function extract(raw){
  const profile=raw?.profile||raw?.authorMeta||raw?.author||raw?.user||raw;
  const posts=raw?.posts||raw?.videos||raw?.latestPosts||raw?.items||[];
  const followers=n(profile?.followers??profile?.fans??profile?.followerCount??profile?.follower_count);
  const following=n(profile?.following??profile?.followingCount??profile?.following_count);
  const totalLikes=n(profile?.likes??profile?.heart??profile?.heartCount??profile?.totalLikes);
  const videoCount=n(profile?.videoCount??profile?.videos??profile?.video_count);

  const vids=(Array.isArray(posts)?posts:[]).map((p,i)=>{
    const s=p.stats||p.stat||{};
    const views=n(s.playCount??s.views??s.viewCount??p.playCount??p.views??p.viewCount);
    const likes=n(s.diggCount??s.likes??s.likeCount??p.likes??p.likeCount);
    const comments=n(s.commentCount??s.comments??p.comments??p.commentCount);
    const shares=n(s.shareCount??s.shares??p.shares??p.shareCount);
    return {
      rank:i+1,
      caption:String(p.text??p.caption??p.desc??p.description??"Tanpa caption"),
      views,likes,comments,shares,
      engagement:views?(likes+comments+shares)/views:0,
      url:p.webVideoUrl??p.url??p.videoUrl??""
    };
  }).sort((a,b)=>b.views-a.views);

  const avgViews=vids.length?vids.reduce((a,x)=>a+x.views,0)/vids.length:0;
  const avgEng=vids.length?vids.reduce((a,x)=>a+x.engagement,0)/vids.length:0;
  const followerViewRatio=followers?avgViews/followers:0;
  const score=Math.max(0,Math.min(100,Math.round(
    Math.min(avgEng*1000,45)+Math.min(followerViewRatio*100,35)+Math.min(vids.length/20*10,10)+10
  )));

  const words={};
  for(const v of vids){
    for(const w of v.caption.toLowerCase().replace(/[^a-z0-9@#_ ]/g," ").split(/\s+/)){
      if(w.length>=5 && !["untuk","dengan","kalau","kalian","banget","ternyata","yang","dari","atau","sudah","bisa"].includes(w))
        words[w]=(words[w]||0)+1;
    }
  }
  const keywords=Object.entries(words).sort((a,b)=>b[1]-a[1]).slice(0,10).map(x=>x[0]);

  return {
    profile:{
      username:String(profile?.username??profile?.uniqueId??profile?.unique_id??profile?.name??""),
      displayName:String(profile?.nickname??profile?.nickName??profile?.displayName??""),
      bio:String(profile?.signature??profile?.bio??""),
      avatar:String(profile?.avatarLarger??profile?.avatarMedium??profile?.avatar??profile?.avatarUrl??""),
      verified:Boolean(profile?.verified),
      followers,following,totalLikes,videoCount
    },
    stats:{avgViews,avgEngagement:avgEng,score,analyzedVideos:vids.length},
    keywords,
    topVideos:vids.slice(0,20),
    recommendations:[
      avgEng>=0.05?"Pertahankan format yang menghasilkan interaksi tinggi.":"Perkuat hook 1–3 detik pertama dan uji beberapa variasi.",
      followerViewRatio>=1?"Akun punya video yang menjangkau lebih besar dari basis followers.":"Coba format yang lebih mudah ditemukan non-followers.",
      "Ambil pola dari 3 video teratas lalu buat 5 variasi baru dengan angle berbeda."
    ]
  };
}

app.post("/api/analyze",async(req,res)=>{
  try{
    if(!TOKEN) return res.status(500).json({error:"APIFY_TOKEN belum dipasang di server."});
    const username=cleanUser(req.body?.username);
    if(!username) return res.status(400).json({error:"Masukkan username TikTok."});

    const endpoint=`https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`;
    const response=await fetch(endpoint,{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${TOKEN}`},
      body:JSON.stringify({username})
    });
    const data=await response.json();
    if(!response.ok) return res.status(response.status).json({error:data?.error?.message||"Apify gagal mengambil data."});
    if(!Array.isArray(data)||!data.length) return res.status(404).json({error:"Username tidak ditemukan atau data publik tidak tersedia."});
    res.json(extract(data[0]));
  }catch(e){res.status(500).json({error:e.message||"Server error"});}
});

app.get("/api/health",(req,res)=>res.json({ok:true,tokenConfigured:Boolean(TOKEN),actor:ACTOR}));
app.listen(PORT,()=>console.log(`TikTok Analyzer: http://localhost:${PORT}`));