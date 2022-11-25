//    async test(article: string) {
//     let response = await axios
//         .get(`https://en.wikipedia.org/wiki/${article}`);
//     const html = response.data;

//     const { document } = new JSDOM(html).window
//     const nickname = document.querySelector('.nickname')
//     if (nickname)
//         return nickname.innerHTML;
//     return null;
// }
