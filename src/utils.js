function chunk(arr, size) {
    return arr.reduce((result, value, index, array) => {
        if (index % size === 0)
            result.push(array.slice(index, index + size));
        return result;
    }, []);
}

function formatMessages(messages) {
    const messagePairs = chunk(messages, 2);
    const formattedPairs = messagePairs.map(pair => {
        return pair.map(message => `${message.from === "user" ? "User:" : "Assistant:"} ${message.text}`).join("\n");
    });

    return formattedPairs.join("\n\n");
}

module.exports = {
    chunk,
    formatMessages
};
