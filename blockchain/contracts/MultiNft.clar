;; MultiNft
;; A single contract for holding many different lines of NFTs, like:
;; https://eips.ethereum.org/EIPS/eip-1155

(define-map classes { id: uint } {
  title: (string-ascii 1024),
  next-token-id: uint,
  nfts: (list 100 {
    uri: (string-ascii 1024),
    owner: principal
  })
})

(define-data-var next-class-id uint u0)

(define-public (create-class (title (string-ascii 1024)))
  (begin
    ;; Add to the classes map.
    (map-set classes { id: (var-get next-class-id) } { title: title, next-token-id: u0, nfts: (list)})
    ;; Increment the next id.
    (var-set next-class-id (+ u1 (var-get next-class-id)))
    ;; Return the id of the new collection.
    (ok (- (var-get next-class-id) u1))
  )
)

(define-public (create-nft (class-id uint) (uri (string-ascii 1024)) (owner principal))
  (let (
      (classm (map-get? classes { id: class-id }))
      (class (unwrap-panic classm))
      (next-token-id (get next-token-id class))
      (next-token-id-new (+ u1 (get next-token-id class)))
      (nfts (get nfts class))
      (nfts-new (append nfts { uri: uri, owner: owner }))
      (nfts-new-newm (as-max-len? nfts-new u10))
      (nfts-new-new (unwrap-panic nfts-new-newm))
      (title (get title class))
    )
    (map-set classes { id: class-id } { title: title, next-token-id: next-token-id-new, nfts: nfts-new-new })
    (ok next-token-id)
  )
)

(define-read-only (read-owner (class-id uint) (token-id uint))
  (ok
    (get owner
      (element-at
        (unwrap-panic
          (get nfts
            (map-get? classes {id: class-id})
          )
        )
        token-id
      )
    )
  )
)

(define-read-only (read-nfts-from-class (class-id uint))
  (let (
      (classm (map-get? classes { id: class-id }))
      (class (unwrap-panic classm))
      (nfts (get nfts class))
    )
    (ok nfts)
  )
)

(define-read-only (read-class-count)
  (ok (var-get next-class-id))
)