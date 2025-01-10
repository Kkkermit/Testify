function addSuffix(number) {
    if (number % 100 >= 11 && number % 100 <= 13)
    return number + "th";

    switch (number % 10) {
        case 1: return number + "st";
        case 2: return number + "nd";
        case 3: return number + "rd";
    }
    return number + "th";
}

module.exports = { addSuffix };