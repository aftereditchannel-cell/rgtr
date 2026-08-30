async function test(url) {
  try {
    const target = encodeURIComponent(url);
    const res = await fetch(`https://api.allorigins.win/get?url=${target}`);
    const json = await res.json();
    const html = json.contents;
    console.log("HTML length:", html.length);
    
    let title = (html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || [])[1];
    let desc = (html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) || [])[1];
    
    console.log("URL:", url);
    console.log("Title:", title);
    console.log("Desc:", desc);
  } catch(e) {
    console.error(e);
  }
}

await test('https://t.me/durov');
await test('https://www.youtube.com/@mkbhd');
await test('https://soundcloud.com/skrillex');
