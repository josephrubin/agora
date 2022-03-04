;; Defines the SIP009 NFT interface.
;; See https://github.com/friedger/sips/blob/main/sips/sips/sip-009-nft-standard.md

(define-trait nft-trait
  (
    ;; The largest ID for a valid token in this collection.
    (get-last-token-id () (response uint uint))

    ;; The URI of the data associated with the fiven token id.
    (get-token-uri (uint) (response (optional (string-ascii 256)) uint))

    ;; The principal owner of the given token id, or none if it's unknown.
    (get-owner (uint) (response (optional principal) uint))

    ;; Transfers the token given by the suppied id from the sender principal
    ;; to the recipient principal.
    (transfer (uint principal principal) (response bool uint))
  )
)
