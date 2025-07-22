function getTimeBetween(now, future) {
    const diff = Math.max(0, Math.floor((future - now) / 1000));
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    
    let result = [];
    if (hours > 0) result.push(`${hours}h`);
    if (minutes > 0) result.push(`${minutes}m`);
    if (seconds > 0 || result.length === 0) result.push(`${seconds}s`);
    
    return result.join(' ');
}

function getFormattedTime(milliseconds) {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    let timeString = '';
    if (hours > 0) timeString += `${hours} hour${hours !== 1 ? 's' : ''} `;
    if (minutes > 0) timeString += `${minutes} minute${minutes !== 1 ? 's' : ''} `;
    if (seconds > 0) timeString += `${seconds} second${seconds !== 1 ? 's' : ''}`;
    
    return timeString.trim();
}

module.exports = {
    getTimeBetween,
    getFormattedTime
};
