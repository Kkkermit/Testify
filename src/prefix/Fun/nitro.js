module.exports = {
    name: 'nitro',
    aliases: ['nitrocode', 'nitrocodegen'],
    description: 'Generate a fake nitro code',
    category: 'Fun',
    usage: 'nitro',
    usableInDms: true,
    async execute(message, client, args) {

        let letter = ['0','1','2','3','4','5','6','7','8','9','a','A','b','B','c','C','d','D','e','E','f','F','g','G','h','H','i','I','j','J','f','F','l','L','m','M','n','N','o','O','p','P','q','Q','r','R','s','S','t','T','u','U','v','V','w','W','x','X','y','Y','z','Z',]
        let result = Math.floor(Math.random() * letter.length);
        let result2 = Math.floor(Math.random() * letter.length);
        let result3 = Math.floor(Math.random() * letter.length);
        let result4 = Math.floor(Math.random() * letter.length);
        let result5 = Math.floor(Math.random() * letter.length);
        let result6 = Math.floor(Math.random() * letter.length);
        let result7 = Math.floor(Math.random() * letter.length);
        let result8 = Math.floor(Math.random() * letter.length);
        let result9 = Math.floor(Math.random() * letter.length);
        let result10 = Math.floor(Math.random() * letter.length);
        let result11 = Math.floor(Math.random() * letter.length);
        let result12 = Math.floor(Math.random() * letter.length);
        let result13 = Math.floor(Math.random() * letter.length);
        let result14 = Math.floor(Math.random() * letter.length);
        let result15 = Math.floor(Math.random() * letter.length);
        let result16 = Math.floor(Math.random() * letter.length);
        
        message.channel.send({ content: "http://discord.gift/" + letter[result] + letter[result2] + letter[result3] + letter[result4] + letter[result5] + letter[result6] + letter[result7] + letter[result8] + letter[result9] + letter[result10] + letter[result11] + letter[result12] + letter[result13] + letter[result14] + letter[result15] + letter[result16]})
    }
}