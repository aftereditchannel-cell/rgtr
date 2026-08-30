const text = "Hi call me at 09123456789 or +989123456789. Site: https://google.com!";
const regex = /(https?:\/\/[^\s()]+?(?=[.,!?:;]*(?:[\s()\[\]]|$))|09\d{9}|\+\d{10,14})/g;
const parts = text.split(regex);
console.log('Parts length:', parts.length);
console.log('Parts:', parts);
