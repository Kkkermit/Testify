function getNextDrawTime(frequency) {
    const now = new Date();
    const nextDraw = new Date();
    
    switch (frequency) {
        case 'hourly':
            nextDraw.setHours(now.getHours() + 1, 0, 0, 0);
            break;
        
        case 'daily':
            nextDraw.setHours(0, 0, 0, 0);
            nextDraw.setDate(nextDraw.getDate() + 1);
            break;
        
        case 'weekly':
            nextDraw.setHours(0, 0, 0, 0);
            const daysUntilSunday = 7 - now.getDay();
            nextDraw.setDate(nextDraw.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
            break;
            
        default:
            nextDraw.setHours(0, 0, 0, 0);
            nextDraw.setDate(nextDraw.getDate() + 1);
    }
    
    return nextDraw;
}

module.exports = {
    getNextDrawTime
};
