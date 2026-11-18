{
    const header = document.querySelector(".site-header");

    function updateHeaderSize() {
        if (window.scrollY >= 80) {
            header.classList.add("is-compact");
        } else if (window.scrollY <= 0) {
            header.classList.remove("is-compact");
        }
    }

    window.addEventListener("scroll", updateHeaderSize, { passive: true });
    updateHeaderSize();
}
