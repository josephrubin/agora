;; NftCollection - A line of NFTs that can be incrementally minted.
;; cf. https://explorer.stacks.co/txid/SP3QSAJQ4EA8WXEDSRRKMZZ29NH91VZ6C5X88FGZQ.thisisnumberone-v2?chain=mainnet

;; Use the SIP009 interface we've defined in this project.
(impl-trait .NftTrait.nft-trait)

;; This contract's NFT builtin.
(define-non-fungible-token TOKEN uint)

(define-data-var last-id uint u0)

;; The maximum number of NFTs that are being offered.
(define-data-var nft-count uint u0)

;; The NFT metadata for all the NFTs that can be claimed.
(define-constant nft-list
  (list
    (tuple (image "https://i.imgur.com/UbAFEx9.png"))
    (tuple (image "https://i.imgur.com/EjLlRfO.png"))
    (tuple (image "https://i.imgur.com/UbAFEx9.png"))
    (tuple (image "https://i.imgur.com/EjLlRfO.png"))))

;; Claim a new NFT
(define-public (claim)
  (mint tx-sender))

;; SIP009: Transfer token to a specified principal
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (if (and
        (is-eq tx-sender sender))
      ;; Make sure to replace MY-OWN-NFT
      (match (nft-transfer? TOKEN token-id sender recipient)
        success (ok success)
        error (err error))
      (err u500)))

;; SIP009: Get the owner of the specified token ID
(define-read-only (get-owner (token-id uint))
  ;; Make sure to replace MY-OWN-NFT
  (ok (nft-get-owner? TOKEN token-id)))

;; SIP009: Get the last token ID
(define-read-only (get-last-token-id)
  (ok (var-get last-id)))

;; SIP009: Get the token URI. You can set it to any other URI
(define-read-only (get-token-uri (token-id uint))
  (let ( (nft-meta (element-at nft-list (- token-id u1))) ) 

    (let ((nft-image (get image nft-meta)))
      (ok nft-image)
    )

  )
)

;; Create the next NFT and assign it to the new-owner.
(define-private (mint (new-owner principal))
    (let ((next-id (+ u1 (var-get last-id))))
      (match (nft-mint? TOKEN next-id new-owner)
        success
          (begin
            (var-set last-id next-id)
            (ok true))
        error (err error))))
